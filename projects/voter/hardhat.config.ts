import type { HardhatUserConfig, NetworkUserConfig } from 'hardhat/types'
import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-web3'
import '@nomiclabs/hardhat-truffle5'
import '@nomicfoundation/hardhat-verify'
import 'hardhat-abi-exporter'
import 'hardhat-contract-sizer'
import 'solidity-coverage'
require('dotenv').config({ path: require('find-config')('.env') })

const bscTestnet: NetworkUserConfig = {
  url: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
  chainId: 97,
  accounts: [process.env.KEY_TESTNET!],
  allowUnlimitedContractSize: true,
}

const bscMainnet: NetworkUserConfig = {
  url: 'https://bsc-dataseed.binance.org/',
  chainId: 56,
  accounts: [process.env.KEY_MAINNET!],
  allowUnlimitedContractSize: true,
}

const sepolia: NetworkUserConfig = {
  url: process.env.SEPOLIA_URL || 'https://rpc.sepolia.dev',
  chainId: 11155111,
  gasPrice: 1000000000,
  accounts: [process.env.KEY_SEPOLIA!],
}

const mantle: NetworkUserConfig = {
  url: process.env.MANTLE_URL || 'https://rpc.mantle.xyz',
  chainId: 5000,
  accounts: [process.env.KEY_MANTLE!],
}

const mantleTestnet: NetworkUserConfig = {
  url: 'https://rpc.sepolia.mantle.xyz',
  chainId: 5003,
  accounts: [process.env.KEY_MANTLE_TESTNET!],
}

const tenderly: NetworkUserConfig = {
  url: process.env.TENDERLY_URL!,
  chainId: Number(process.env.TENDERLY_CHAINID!),
  accounts: [process.env.KEY_TENDERLY!],
}

const taikoHelka: NetworkUserConfig = {
  url: 'https://rpc.hekla.taiko.xyz',
  chainId: 167009,
  accounts: [process.env.KEY_TESTNET!],
}

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {},
    ...(process.env.KEY_TESTNET && { bscTestnet }),
    ...(process.env.KEY_MAINNET && { bscMainnet }),
    ...(process.env.KEY_SEPOLIA && { sepolia }),
    ...(process.env.KEY_MANTLE && { mantle }),
    ...(process.env.KEY_MANTLE && { mantleProd: mantle }),
    ...(process.env.KEY_MANTLE_TESTNET && { mantleTestnet }),
    tenderly,
    taikoHelka,
    // testnet: bscTestnet,
    // mainnet: bscMainnet,
  },

  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY || '',
      mantle: process.env.MANTLESCAN_API_KEY || '',
      mantleProd: process.env.MANTLESCAN_API_KEY || '',
    },
    customChains: [
      {
        network: 'mantleTestnet',
        chainId: 5003,
        urls: {
          apiURL: 'https://explorer.testnet.mantle.xyz/api',
          browserURL: 'https://explorer.testnet.mantle.xyz',
        },
      },
      {
        network: 'mantle',
        chainId: 5000,
        urls: {
          apiURL: 'https://api.mantlescan.xyz/api',
          browserURL: 'https://mantlescan.xyz',
        },
      },
      {
        network: 'mantleProd',
        chainId: 5000,
        urls: {
          apiURL: 'https://api.mantlescan.xyz/api',
          browserURL: 'https://mantlescan.xyz',
        },
      },
      {
        network: 'taikoHelka',
        chainId: 167009,
        urls: {
          apiURL: "https://blockscoutapi.hekla.taiko.xyz/api ",
          browserURL: "https://blockscoutapi.hekla.taiko.xyz/",
        }
      }
    ],
  },
  solidity: {
    compilers: [
      {
        version: '0.6.12',
        settings: {
          optimizer: {
            enabled: true,
            runs: 100,
          },
        },
      },
      {
        version: '0.8.17',
        settings: {
          optimizer: {
            enabled: true,
            runs: 100,
          },
        },
      },
    ],
  },

  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
}

export default config
