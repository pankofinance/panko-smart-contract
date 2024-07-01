#!/usr/bin/env zx
// import 'zx/globals'

const networks = {
  eth: 'eth',
  goerli: 'goerli',
  sepolia: 'sepolia',
  bscMainnet: 'bscMainnet',
  bscTestnet: 'bscTestnet',
  hardhat: 'hardhat',
  mantle: 'mantle',
  mantleProd: 'mantleProd',
  tenderly: 'tenderly',
  taikoHelka: 'taikoHelka',
}

let network = process.env.NETWORK
console.log(network, 'network')
if (!network || !networks[network]) {
  throw new Error(`env NETWORK: ${network}`)
}

await $`yarn workspace @pancakeswap/v3-core run hardhat run scripts/verify.ts --network ${network}`
await $`yarn workspace @pancakeswap/v3-periphery run hardhat run scripts/verify.ts --network ${network}`
await $`yarn workspace @pancakeswap/stable-swap run hardhat run scripts/verify.ts --network ${network}`
await $`yarn workspace @pancakeswap/smart-router run hardhat run scripts/verify.ts --network ${network}`
await $`yarn workspace @pancakeswap/masterchef-v3 run hardhat run scripts/verify.ts --network ${network}`
await $`yarn workspace @pancakeswap/v3-lm-pool run hardhat run scripts/verify.ts --network ${network}`
await $`yarn workspace @pancakeswap/voter run hardhat run scripts/verify.ts --network ${network}`
await $`yarn workspace @pancakeswap/v3-farm run hardhat run scripts/verify.ts --network ${network}`
await $`yarn workspace @pancakeswap/fee run hardhat run scripts/verify.ts --network ${network}`

console.log(chalk.blue('Done!'))
