#!/usr/bin/env zx
// import 'zx/globals'

const networks = {
  eth: 'eth',
  goerli: 'goerli',
  sepolia: 'sepolia',
  bscMainnet: 'bscMainnet',
  bscTestnet: 'bscTestnet',
  hardhat: 'hardhat',
  tenderly: 'tenderly',
  mantle: 'mantle',
  mantleProd: 'mantleProd',
  mantleTestnet: 'mantleTestnet',
}

let network = process.env.NETWORK
console.log(network, 'network')
if (!network || !networks[network]) {
  throw new Error(`env NETWORK: ${network}`)
}

await $`yarn workspace @mancakeswap/scripts run hardhat run ${process.argv[3]} --network ${network}`

console.log(chalk.green('Done!'))
