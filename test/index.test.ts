import { fileURLToPath } from 'url'
import { expect, it, describe } from 'vitest'
import { loadConfig } from '../src'

describe('c12', () => {
  const r = path => fileURLToPath(new URL(path, import.meta.url))

  const transformPaths = obj => JSON.parse(JSON.stringify(obj).replaceAll(r('.'), '<path>/'))

  it('load fixture config', async () => {
    const { config, layers } = await loadConfig({
      cwd: r('./fixture'),
      dotenv: true,
      globalRc: true,
      extend: {
        extendKey: ['theme', 'extends']
      },
      resolve: (id) => {
        if (id === 'virtual') {
          return { config: { virtual: true } }
        }
      },
      overrides: {
        overriden: true
      },
      defaults: {
        defaultConfig: true,
        overridenArray: [1, 2, 3]
      },
      defaultConfig: {
        extends: ['virtual']
      }
    })

    expect(transformPaths(config)).toMatchInlineSnapshot(`
      {
        "array": [
          "a",
          "b",
        ],
        "baseConfig": true,
        "colors": {
          "primary": "user_primary",
          "secondary": "theme_secondary",
          "text": "base_text",
        },
        "configFile": true,
        "defaultConfig": true,
        "devConfig": true,
        "npmConfig": true,
        "overriden": true,
        "overridenArray": [
          "a",
          "b",
          "c",
        ],
        "rcFile": true,
        "testConfig": true,
        "virtual": true,
      }
    `)

    expect(transformPaths(layers)).toMatchInlineSnapshot(`
      [
        {
          "config": {
            "overriden": true,
          },
        },
        {
          "config": {
            "array": [
              "a",
            ],
            "colors": {
              "primary": "user_primary",
            },
            "configFile": true,
            "extends": [
              "./config.dev",
              "c12-npm-test",
            ],
            "overriden": false,
            "overridenArray": [
              "a",
              "b",
              "c",
            ],
            "theme": "./theme",
          },
          "configFile": "config",
          "cwd": "<path>/fixture",
        },
        {
          "config": {
            "rcFile": true,
            "testConfig": true,
          },
          "configFile": ".configrc",
        },
        {
          "config": {
            "colors": {
              "primary": "theme_primary",
              "secondary": "theme_secondary",
            },
          },
          "configFile": "<path>/fixture/theme/config.ts",
          "cwd": "<path>/fixture/theme",
        },
        {
          "config": {
            "array": [
              "b",
            ],
            "baseConfig": true,
            "colors": {
              "primary": "base_primary",
              "text": "base_text",
            },
          },
          "configFile": "<path>/fixture/base/config.ts",
          "cwd": "<path>/fixture/base",
        },
        {
          "config": {
            "devConfig": true,
          },
          "configFile": "<path>/fixture/config.dev.ts",
          "cwd": "<path>/fixture",
        },
        {
          "config": {
            "npmConfig": true,
          },
          "configFile": "<path>/fixture/node_modules/c12-npm-test/config.ts",
          "cwd": "<path>/fixture/node_modules/c12-npm-test",
        },
        {
          "config": {
            "virtual": true,
          },
        },
      ]
    `)
  })

  it('extend from git repo', async () => {
    const { config } = await loadConfig({
      cwd: r('./fixture/new_dir'),
      overrides: {
        extends: ['github:unjs/c12/test/fixture']
      }
    })

    expect(transformPaths(config)).toMatchInlineSnapshot(`
      {
        "array": [
          "a",
        ],
        "colors": {
          "primary": "user_primary",
        },
        "configFile": true,
        "devConfig": true,
        "npmConfig": true,
        "overriden": false,
        "theme": "./theme",
      }
    `)
  })
})
