import fs from "fs";
import child_process from "child_process";
import path from "path";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import remarkParse from "remark-parse";
import { unified } from "unified";
import remarkRehype from "remark-rehype";
import rehypeReact from "rehype-react";
import rehypeInferDescriptionMeta from "rehype-infer-description-meta";
import remarkFrontmatter from "remark-frontmatter";
import remarkParseFrontmatter from "remark-parse-frontmatter";

export const PostsPerPage = process.env.POSTS_PER_PAGE
  ? parseInt(process.env.POSTS_PER_PAGE)
  : 5;

export async function getPosts() {
  return await getPostsPromise;
}

export type Post = {
  file: string;
  title: string;
  slug: string;
  index: number;
  children: React.ReactNode;
  description: string;
  created_at: Date;
  updated_at: Date;
  wordCount: number;
};

const POSTS_DIRECTORY = process.env.POSTS_DIRECTORY ?? ".posts";

if (!process.env.POSTS_DIRECTORY) {
  console.warn("Using default posts path: " + POSTS_DIRECTORY);
}

const files = fs.readdirSync(POSTS_DIRECTORY, {
  recursive: true,
  encoding: "utf-8",
});

const getPostsPromise = Promise.all(
  files
    .filter((file) => file.includes(".md"))
    .map(async (file, index) => {
      // Use git to get the last modified date of the file
      const filePath = path.resolve(POSTS_DIRECTORY, file);

      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found at \"${filePath}\"`);
      }

      const slug = file.replace(/.md$/, "").replace(/[\s\/\\]/g, "-");

      const raw = fs.readFileSync(filePath, "utf-8");
      const processed = await processMarkdown(raw);

      const title =
        //@ts-ignore
        processed.data.frontmatter.title || // Frontmatter
        raw.match(/^#\s(.*)$/m)?.[1] || // First h1
        raw.match(/^##\s(.*)$/m)?.[1] || // First h2
        file.replace(/.md$/, ""); // File name

      return {
        file,
        title,
        slug,
        index,
        children: processed.result,
        wordCount: raw.trim().split(/\s+/).length,
        description: processed.data.meta?.description ?? "No description.",
        ...getGitProperties(filePath),
      } satisfies Post;
    })
);

function getGitProperties(file: string) {
  const stdout = child_process
    .execSync(`git log --follow --format=%ad --date default \"${file}\"`)
    .toString();

  const dates = stdout.split("\n").filter((x: any) => x);

  if (dates.length === 0) {
    // Not in git, we are debugging

    return {
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

  return {
    created_at: new Date(dates[0]),
    updated_at: new Date(dates[dates.length - 1]),
  };
}

async function processMarkdown(content: string) {
  return await unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ["toml", "yaml"])
    .use(remarkParseFrontmatter)
    .use(remarkRehype)
    .use(rehypeInferDescriptionMeta, {
      truncateSize: 240,
      ignoreSelector: "h1, h2, h3, style, script, noscript, template",
    })
    .use(rehypeSlug)
    .use(rehypeHighlight)
    .use(remarkGfm)
    .use(rehypeReact, require("react/jsx-runtime"))
    .process(content);
}
