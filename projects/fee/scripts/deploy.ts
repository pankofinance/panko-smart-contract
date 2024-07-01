import { ethers, network } from 'hardhat'
import { configs } from '@pancakeswap/common/config'
import fs from 'fs'

import { abi as MasterChefV3ABI } from '@pancakeswap/masterchef-v3/artifacts/contracts/MasterChefV3.sol/MasterChefV3.json'

async function main() {
  const [owner] = await ethers.getSigners()
  // Remember to update the init code hash in SC for different chains before deploying
  const networkName = network.name
  const config = configs[networkName as keyof typeof configs]
  if (!config) {
    throw new Error(`No config found for network ${networkName}`)
  }

  const mcV3DeployedContracts = await import(`@pancakeswap/masterchef-v3/deployed/${networkName}.json`)

  const MasterChefV3Receiver = await ethers.getContractFactory('MasterChefV3Receiver')
  const v3receiver = await MasterChefV3Receiver.deploy(
    mcV3DeployedContracts.MasterChefV2,
    mcV3DeployedContracts.MasterChefV3,
    mcV3DeployedContracts.GainToken,
    0,
    config.txConfig
  )
  await v3receiver.deployed()
  console.log('v3receiver deployed to:', v3receiver.address)

  let tx
  const mcv3 = await ethers.getContractAt(MasterChefV3ABI, mcV3DeployedContracts.MasterChefV3, owner)
  tx = await mcv3.setReceiver(v3receiver.address)
  await tx.wait(5)
  console.log('MasterChefV3 setReceiver:', tx.hash)

  const contracts = {
    MasterChefV3Receiver: v3receiver.address,
  }
  fs.writeFileSync(`./deployed/${networkName}.json`, JSON.stringify(contracts, null, 2))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
