import path from "path"
import { writeFile } from "fs/promises"

import { BuildArgs } from "gatsby"

type Redirect = {
  fromPath: string
  isPermanent: boolean
  ignoreCase: boolean
  redirectInBrowser: boolean
  toPath: string
  statusCode: number
}

async function writeRedirectsFile(redirects: Redirect[], folder: string) {
  console.log("writeRedirectsFile", redirects.length)
  if (!redirects.length) return

  console.log("folder", folder)
  const filePath = path.join(folder, "redirects-amplify.json")

  const result = redirects.map(({ fromPath, toPath, statusCode }) => ({
    source: fromPath,
    target: toPath,
    status: statusCode,
  }))

  const rules = { customRules: result }

  await writeFile(filePath, JSON.stringify(rules))
  console.log(`Exported ${result.length} redirects to ${filePath}`)
}

exports.onPostBuild = async ({ store }: BuildArgs) => {
  const { redirects, program } = store.getState()

  const folder = path.join(program.directory, "public")
  console.log("redirects", redirects)
  return await writeRedirectsFile(redirects, folder)
}
