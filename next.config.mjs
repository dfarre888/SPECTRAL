import path from 'path'
import { fileURLToPath } from 'url'
import CopyWebpackPlugin from 'copy-webpack-plugin'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const cesiumSource = 'node_modules/cesium/Build/Cesium'
const cesiumBaseUrl = '_next/static/Cesium'

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
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

    return config
  },

  env: {
    NEXT_PUBLIC_CESIUM_BASE_URL: `/${cesiumBaseUrl}`,
  },
}

export default nextConfig
