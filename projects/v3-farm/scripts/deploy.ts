import { ethers, network } from 'hardhat'
import { configs } from '@pancakeswap/common/config'
import { tryVerify } from '@pancakeswap/common/verify'
import fs from 'fs'
import { abi as MasterChefV3ABI } from '@pancakeswap/masterchef-v3/artifacts/contracts/MasterChefV3.sol/MasterChefV3.json'
import { abi as VEGainABI } from '@pancakeswap/voter/artifacts/contracts/VEGain.sol/VEGain.json'

import { parseEther } from 'ethers/lib/utils'
const currentNetwork = network.name

export const cA = 50000n
export const cB = 4000n

async function main() {
  const [owner] = await ethers.getSigners()
  // Remember to update the init code hash in SC for different chains before deploying
  const networkName = network.name
  const config = configs[networkName as keyof typeof configs]
  if (!config) {
    throw new Error(`No config found for network ${networkName}`)
  }

  const voterDeployedContracts = await import(`@pancakeswap/voter/deployed/${networkName}.json`)
  const mcV3DeployedContracts = await import(`@pancakeswap/masterchef-v3/deployed/${networkName}.json`)

  const FarmBooster = await ethers.getContractFactory('FarmBooster')
  const farmBooster = await FarmBooster.deploy(voterDeployedContracts.VEGain, mcV3DeployedContracts.MasterChefV3, cA, cB)
  await farmBooster.deployed()
  console.log('FarmBooster deployed to:', farmBooster.address)

  const masterchefV3 = new ethers.Contract(mcV3DeployedContracts.MasterChefV3, MasterChefV3ABI, owner)
  await masterchefV3.updateFarmBoostContract(farmBooster.address)
  console.log('FarmBooster updated in MasterChefV3')

  const vegain = new ethers.Contract(voterDeployedContracts.VEGain, VEGainABI, owner)
  await vegain.setFarmBooster(farmBooster.address)
  console.log('FarmBooster updated in VEGain')

  await farmBooster.setVECakeCaller(vegain.address)
  console.log('VECakeCaller updated in FarmBooster')

  const contracts = {
    FarmBooster: farmBooster.address,
  }
  fs.writeFileSync(`./deployed/${networkName}.json`, JSON.stringify(contracts, null, 2))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
