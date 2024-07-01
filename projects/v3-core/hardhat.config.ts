import type { HardhatUserConfig, NetworkUserConfig } from 'hardhat/types'
import '@nomiclabs/hardhat-ethers'
import '@nomicfoundation/hardhat-verify'
import '@nomiclabs/hardhat-waffle'
import '@typechain/hardhat'
import 'hardhat-watcher'
import 'dotenv/config'
import 'solidity-docgen'

require('dotenv').config({ path: require('find-config')('.env') })

const LOW_OPTIMIZER_COMPILER_SETTINGS = {
  version: '0.7.6',
  settings: {
    evmVersion: 'istanbul',
    optimizer: {
      enabled: true,
      runs: 2_000,
    },
    metadata: {
      bytecodeHash: 'none',
    },
  },
}

const LOWEST_OPTIMIZER_COMPILER_SETTINGS = {
  version: '0.7.6',
  settings: {
    evmVersion: 'istanbul',
    optimizer: {
      enabled: true,
      runs: 100,
    },
    metadata: {
      bytecodeHash: 'none',
    },
  },
}

const DEFAULT_COMPILER_SETTINGS = {
  version: '0.7.6',
  settings: {
    evmVersion: 'istanbul',
    optimizer: {
      enabled: true,
      runs: 1_000_000,
    },
    metadata: {
      bytecodeHash: 'none',
    },
  },
}

const bscTestnet: NetworkUserConfig = {
  url: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
  chainId: 97,
  accounts: [process.env.KEY_TESTNET!],
}

const bscMainnet: NetworkUserConfig = {
  url: 'https://bsc-dataseed.binance.org/',
  chainId: 56,
  accounts: [process.env.KEY_MAINNET!],
}

const goerli: NetworkUserConfig = {
  url: 'https://rpc.ankr.com/eth_goerli',
  chainId: 5,
  accounts: [process.env.KEY_GOERLI!],
}

const sepolia: NetworkUserConfig = {
  url: process.env.SEPOLIA_URL || 'https://rpc.sepolia.dev',
  chainId: 11155111,
  gasPrice: 1000000000,
  accounts: [process.env.KEY_SEPOLIA!],
}

const eth: NetworkUserConfig = {
  url: 'https://eth.llamarpc.com',
  chainId: 1,
  accounts: [process.env.KEY_ETH!],
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
  blockGasLimit: 12_500_000_000,
}

const taikoHelka: NetworkUserConfig = {
  url: 'https://rpc.hekla.taiko.xyz',
  chainId: 167009,
  accounts: [process.env.KEY_TESTNET!],
}

export default {
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    },
    ...(process.env.KEY_TESTNET && { bscTestnet }),
    ...(process.env.KEY_MAINNET && { bscMainnet }),
    ...(process.env.KEY_GOERLI && { goerli }),
    ...(process.env.KEY_SEPOLIA && { sepolia }),
    ...(process.env.KEY_ETH && { eth }),
    ...(process.env.KEY_MANTLE && { mantle }),
    ...(process.env.KEY_MANTLE && { mantleProd: mantle }),
    ...(process.env.KEY_MANTLE_TESTNET && { mantleTestnet }),
    tenderly,
    taikoHelka,
    // mainnet: bscMainnet,
  },
  tenderly: {
    username: 'gollum',
    project: 'cakey',
    // Contract visible only in Tenderly.
    // Omitting or setting to `false` makes it visible to the whole world.
    // Alternatively, control verification visibility using
    // an environment variable `TENDERLY_PRIVATE_VERIFICATION`.
    privateVerification: true,
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY || '',
      mantle: process.env.ETHERSCAN_API_KEY || '',
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
        // urls: {
        //   apiURL: 'https://api.mantlescan.xyz/api',
        //   browserURL: 'https://mantlescan.xyz',
        // },
        urls: {
          apiURL: 'https://explorer.mantle.xyz/api',
          browserURL: 'https://explorer.mantle.xyz',
        },
      },
      {
        network: 'mantleProd',
        chainId: 5000,
        urls: {
          apiURL: 'https://api.mantlescan.xyz/api',
          browserURL: 'https://mantlescan.xyz',
        },
        // urls: {
        //   apiURL: 'https://explorer.mantle.xyz/api',
        //   browserURL: 'https://explorer.mantle.xyz',
        // },
      },
    ],
  },
  solidity: {
    compilers: [DEFAULT_COMPILER_SETTINGS],
    overrides: {
      'contracts/GainV3Pool.sol': LOWEST_OPTIMIZER_COMPILER_SETTINGS,
      'contracts/GainV3PoolDeployer.sol': LOWEST_OPTIMIZER_COMPILER_SETTINGS,
      'contracts/test/OutputCodeHash.sol': LOWEST_OPTIMIZER_COMPILER_SETTINGS,
    },
  },
  watcher: {
    test: {
      tasks: [{ command: 'test', params: { testFiles: ['{path}'] } }],
      files: ['./test/**/*'],
      verbose: true,
    },
  },
  docgen: {
    pages: 'files',
  },
}
