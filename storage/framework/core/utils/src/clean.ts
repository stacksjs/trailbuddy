import { path as p } from '@stacksjs/path'

export async function cleanProject(): Promise<void> {
  const shell = Bun.$
  await shell`rm -rf ${p.projectPath('bun.lock')}`
  await shell`rm -rf ${p.projectPath('yarn.lock')}` // just in case
  await shell`rm -rf ${p.projectPath('node_modules/')}`
  await shell`rm -rf ${p.frameworkPath('dist')}`
  await shell`rm -rf ${p.frameworkPath('node_modules')}`
  await shell`rm -rf ${p.frameworkPath('**/dist')}`
  await shell`rm -rf ${p.frameworkPath('**/node_modules')}`
  await shell`rm -rf ${p.frameworkCloudPath('cdk.out/')}`
  await shell`rm -rf ${p.frameworkCloudPath('cdk.context.json')}`
  await shell`rm -rf ${p.cloudPath('dist.zip')}`
}
