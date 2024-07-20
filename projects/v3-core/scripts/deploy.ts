import { ethers, network } from 'hardhat'
import fs from 'fs'
import { configs } from '@pancakeswap/common/config'

async function main() {
  const [owner] = await ethers.getSigners()
  console.log('owner', owner.address)
  const networkName = network.name
  const config = configs[networkName as keyof typeof configs]
  if (!config) {
    throw new Error(`No config found for network ${networkName}`)
  }

  const V3PoolDeployer = await ethers.getContractFactory('SwapLabsV3PoolDeployer')
  let v3PoolDeployer = await V3PoolDeployer.deploy(config.txConfig)
  v3PoolDeployer = await v3PoolDeployer.deployed()
  console.log('v3PoolDeployer', v3PoolDeployer.address)

  const V3Factory = await ethers.getContractFactory('SwapLabsV3Factory')
  let v3Factory = await V3Factory.deploy(v3PoolDeployer.address, config.txConfig)
  v3Factory = await v3Factory.deployed()
  console.log('v3Factory', v3Factory.address)

  // Set FactoryAddress for v3PoolDeployer.
  await v3PoolDeployer.setFactoryAddress(v3Factory.address, config.txConfig)
  console.log('FactoryAddress set for v3PoolDeployer', v3Factory.address)

  const contracts = {
    V3Factory: v3Factory.address,
    V3PoolDeployer: v3PoolDeployer.address,
  }

  fs.writeFileSync(`./deployed/${networkName}.json`, JSON.stringify(contracts, null, 2))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
