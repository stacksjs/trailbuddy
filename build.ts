#!/usr/bin/env bun
import { buildApp } from '@stacksjs/stx'
import { generateMobileAssociations } from './scripts/generate-mobile-associations'

// eslint-disable-next-line ts/no-top-level-await
await generateMobileAssociations()
// eslint-disable-next-line ts/no-top-level-await
await buildApp()
