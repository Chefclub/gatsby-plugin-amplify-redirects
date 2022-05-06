import path from "path"
import { writeFile } from "fs/promises"
import { existsSync, mkdirSync } from "fs"

import { BuildArgs } from "gatsby"

type Redirect = {
  fromPath: string
  isPermanent: boolean
  ignoreCase: boolean
  redirectInBrowser: boolean
  toPath: string
  statusCode: number
}

const compareRedirectScore = (a: Redirect, b: Redirect) => {
  return compareMatchPathScore(a.fromPath, b.fromPath)
}

const compareMatchPathScore = (a: string, b: string) => {
  const aScore = getMatchPathScore(a)
  const bScore = getMatchPathScore(b)
  if (aScore > bScore) {
    return -1
  } else if (aScore < bScore) {
    return 1
  } else {
    return 0
  }
}

const getMatchPathScore = (matchPath: string) => {
  let score = 0

  const matchPathParts = matchPath.split("/")

  score += matchPathParts.length * 4

  matchPathParts.forEach(part => {
    if (part === "") {
      score++
    } else if (part.match(/\*/)) {
      score -= 1
    } else if (part.match(/:.*/)) {
      score += 2
    } else if (part.match(/[^:].*/)?.index === 0) {
      score += 3
    }
  })

  return matchPath.replace(/\/\*/, "/<*>")
}

const formatMatchPath = (matchPath: string) => {
  return matchPath.replace(/\/\*/, "/<*>")
}

async function writeRedirectsFile(
  redirects: Redirect[],
  folder: string,
  file?: string
) {
  if (!redirects.length) return

  const filePath = path.join(folder, file || "redirects-amplify.json")

  const result = redirects
    .sort(compareRedirectScore)
    .map(({ fromPath, toPath, statusCode, redirectInBrowser }) => {
      const is404_200: boolean = statusCode === 404 && !redirectInBrowser
      const isExternalLink =
        toPath.startsWith("http://") || toPath.startsWith("https://")

      return {
        source: formatMatchPath(fromPath),
        target: formatMatchPath(
          isExternalLink
            ? toPath
            : path.join(
                toPath,
                is404_200 && toPath.split("/").slice(-1)[0] === ""
                  ? "index.html"
                  : ""
              )
        ),
        status: is404_200 ? "404-200" : `${statusCode}`,
      }
    })

  const rules = { customRules: result }

  const folderPathParts = filePath.split("/")
  folderPathParts.pop()
  const folderPath = folderPathParts.join("/")
  if (!existsSync(folderPath)) {
    mkdirSync(folderPath, { recursive: true })
  }
  await writeFile(filePath, JSON.stringify(rules))
  console.log(`Exported ${result.length} redirects to ${filePath}`)
}

exports.onPostBuild = async ({ store }: BuildArgs) => {
  const { redirects, program, config } = store.getState()

  const filePath =
    config.plugins.find(
      (p: any) => p.resolve === "gatsby-plugin-amplify-redirects"
    )?.options?.redirectFilePath ?? undefined

  const folder = path.join(program.directory)

  return await writeRedirectsFile(redirects, folder, filePath)
}
