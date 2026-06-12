import path from 'path'
import { fileURLToPath } from 'url'
import CopyWebpackPlugin from 'copy-webpack-plugin'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const cesiumSource = 'node_modules/cesium/Build/Cesium'
const cesiumBaseUrl = '_next/static/Cesium'

const cesiumWorkers = path.resolve(__dirname, 'node_modules/cesium/Build/Cesium/Workers')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // SWC minifier chokes on Cesium worker ES modules — use Terser with exclude
  swcMinify: false,
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      config.plugins.push(
        new CopyWebpackPlugin({
          patterns: [
            { from: path.join(cesiumSource, 'Cesium.js'), to: 'static/Cesium/Cesium.js' },
            { from: path.join(cesiumSource, 'Workers'), to: 'static/Cesium/Workers' },
            { from: path.join(cesiumSource, 'ThirdParty'), to: 'static/Cesium/ThirdParty' },
            { from: path.join(cesiumSource, 'Assets'), to: 'static/Cesium/Assets' },
            { from: path.join(cesiumSource, 'Widgets'), to: 'static/Cesium/Widgets' },
          ],
        })
      )
    }

    config.resolve.alias = {
      ...config.resolve.alias,
      cesium$: path.resolve(__dirname, cesiumSource),
      cesium: path.resolve(__dirname, cesiumSource),
    }

    config.module.unknownContextCritical = false
    config.module.exprContextCritical = false

    // Emit Cesium Workers as static assets — do not bundle/minify worker ES modules
    config.module.rules.unshift({
      test: /\.js$/,
      include: cesiumWorkers,
      type: 'asset/resource',
      generator: {
        filename: 'static/Cesium/Workers/[name][ext]',
      },
    })

    const cesiumExclude = /(static\/Cesium|node_modules[\\/]cesium|Cesium[\\/]Workers)/
    if (!dev && !isServer && config.optimization?.minimizer) {
      config.optimization.minimizer = config.optimization.minimizer.map((plugin) => {
        const name = plugin.constructor?.name ?? ''
        if (name === 'TerserPlugin' || name.includes('Swc')) {
          const prevExclude = plugin.options?.exclude
          plugin.options = {
            ...plugin.options,
            exclude: prevExclude
              ? Array.isArray(prevExclude)
                ? [...prevExclude, cesiumExclude]
                : [prevExclude, cesiumExclude]
              : cesiumExclude,
          }
        }
        return plugin
      })
    }

    return config
  },

  env: {
    NEXT_PUBLIC_CESIUM_BASE_URL: `/${cesiumBaseUrl}`,
  },
}

export default nextConfig
