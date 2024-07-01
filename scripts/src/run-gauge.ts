import { ethers, network } from 'hardhat'

import { abi as MasterChefABI } from '@pancakeswap/masterchef-v3/artifacts/contracts/MasterChef.sol/MasterChef.json'
import { abi as MasterChefV2ABI } from '@pancakeswap/masterchef-v3/artifacts/contracts/MasterChefV2.sol/MasterChefV2.json'
import { abi as MasterChefV3ABI } from '@pancakeswap/masterchef-v3/artifacts/contracts/MasterChefV3.sol/MasterChefV3.json'

import { abi as MasterChefV3ReceiverABI } from '@pancakeswap/fee/artifacts/contracts/receiver/MasterChefV3Receiver.sol/MasterChefV3Receiver.json'

import { abi as ERC20ABI } from '@openzeppelin/contracts/build/contracts/IERC20.json'

import { abi as GaugeVotingABI } from '@pancakeswap/voter/artifacts/contracts/GaugeVoting.sol/GaugeVoting.json'

const REV_SHARE_EMISSION = '0x'

async function main() {
  const [owner] = await ethers.getSigners()
  const networkName = network.name

  let tx

  const mc = await import(`@pancakeswap/masterchef-v3/deployed/${networkName}.json`)
  const masterchef = new ethers.Contract(mc.MasterChef, MasterChefABI, owner)
  const masterchefv2 = new ethers.Contract(mc.MasterChefV2, MasterChefV2ABI, owner)
  const masterchefv3 = new ethers.Contract(mc.MasterChefV3, MasterChefV3ABI, owner)

  const voter = await import(`@pancakeswap/voter/deployed/${networkName}.json`)
  const gaugeVoting = new ethers.Contract(voter.GaugeVoting, GaugeVotingABI, owner)

  tx = await gaugeVoting.addGauge(
    REV_SHARE_EMISSION, // rev share pool
    3,
    0,
    1,
    masterchefv2.address,
    5000,
    1,
    5000
  )
  await tx.wait(5)
  console.log('GaugeVoting addGauge:', tx.hash)

  // const LP = '0xf805d18e057450182df1b877319497344586dbc8'
  // tx = await masterchefv2.add(100, LP, true, false)
  // await tx.wait(5)
  // console.log('MasterChefv2 add:', tx.hash)

  // tx = await gaugeVoting.addGauge(LP, 0, 0, 2, masterchefv2.address, 5000, 1, 3000)
  // await tx.wait(5)
  // console.log('GaugeVoting addGauge:', tx.hash)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
