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
  taikoHelka: 'taikoHelka',
}

let network = process.env.NETWORK
console.log(network, 'network')
if (!network || !networks[network]) {
  throw new Error(`env NETWORK: ${network}`)
}

// await $`yarn workspace @pancakeswap/v3-core run hardhat run scripts/deploy.ts --network ${network}`
// await $`yarn workspace @pancakeswap/v3-core run hardhat run scripts/deploy_outputCodeHash.ts --network ${network}`

// await $`yarn workspace @pancakeswap/v3-periphery run hardhat run scripts/deploy2.ts --network ${network}`
// await $`yarn workspace @pancakeswap/v3-periphery run hardhat run scripts/deploy2_interfacemulticallv2.ts --network ${network}`

// await $`yarn workspace @pancakeswap/stable-swap run hardhat run scripts/deploy.ts --network ${network}`

// await $`yarn workspace @pancakeswap/smart-router run hardhat run scripts/deploy2.ts --network ${network}`

// await $`yarn workspace @pancakeswap/masterchef-v3 run hardhat run scripts/deploy2.ts --network ${network}`

// await $`yarn workspace @pancakeswap/v3-lm-pool run hardhat run scripts/deploy2.ts --network ${network}`

// await $`yarn workspace @pancakeswap/voter run hardhat run scripts/deploy.ts --network ${network}`

// await $`yarn workspace @pancakeswap/v3-farm run hardhat run scripts/deploy.ts --network ${network}`

await $`yarn workspace @pancakeswap/fee run hardhat run scripts/deploy.ts --network ${network}`

console.log(chalk.blue('Done!'))

const c = await fs.readJson(`./projects/v3-core/deployed/${network}.json`)
const p = await fs.readJson(`./projects/v3-periphery/deployed/${network}.json`)
const s = await fs.readJson(`./projects/stable-swap/deployed/${network}.json`)
const r = await fs.readJson(`./projects/router/deployed/${network}.json`)
const m = await fs.readJson(`./projects/masterchef-v3/deployed/${network}.json`)
const l = await fs.readJson(`./projects/v3-lm-pool/deployed/${network}.json`)
const v = await fs.readJson(`./projects/voter/deployed/${network}.json`)
const f = await fs.readJson(`./projects/v3-farm/deployed/${network}.json`)
const fee = await fs.readJson(`./projects/fee/deployed/${network}.json`)

const addresses = {
  ...(c || {}),
  ...(p || {}),
  ...(s || {}),
  ...(r || {}),
  ...(m || {}),
  ...(l || {}),
  ...(v || {}),
  ...(f || {}),
  ...(fee || {}),
}

console.log(chalk.blue('Writing to file...'))
console.log(chalk.yellow(JSON.stringify(addresses, null, 2)))

fs.writeJson(`./deployed/${network}.json`, addresses, { spaces: 2 })
