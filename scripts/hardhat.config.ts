import type { HardhatUserConfig, NetworkUserConfig } from 'hardhat/types'
import '@nomiclabs/hardhat-ethers'
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

const taikoHelka: NetworkUserConfig = {
  url: 'https://rpc.hekla.taiko.xyz',
  chainId: 167009,
  accounts: [process.env.KEY_TESTNET!],
}

const tenderly: NetworkUserConfig = {
  url: process.env.TENDERLY_URL!,
  chainId: Number(process.env.TENDERLY_CHAINID!),
  accounts: [process.env.KEY_TENDERLY!],
  gas: 1000_000_000_000,
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
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
}

export default config
