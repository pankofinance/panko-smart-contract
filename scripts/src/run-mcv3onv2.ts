import { ethers, network } from 'hardhat'
import { abi as ERC20ABI } from '@openzeppelin/contracts/build/contracts/IERC20.json'

import { abi as MasterChefABI } from '@pancakeswap/masterchef-v3/artifacts/contracts/MasterChef.sol/MasterChef.json'
import { abi as MasterChefV2ABI } from '@pancakeswap/masterchef-v3/artifacts/contracts/MasterChefV2.sol/MasterChefV2.json'
import { abi as MasterChefV3ABI } from '@pancakeswap/masterchef-v3/artifacts/contracts/MasterChefV3.sol/MasterChefV3.json'
import { abi as MasterChefV3ReceiverABI } from '@pancakeswap/fee/artifacts/contracts/receiver/MasterChefV3Receiver.sol/MasterChefV3Receiver.json'
import { configs } from '@pancakeswap/common/config'

async function main() {
  const [owner] = await ethers.getSigners()
  const networkName = network.name

  const config = configs[networkName as keyof typeof configs]
  if (!config) {
    throw new Error(`No config found for network ${networkName}`)
  }

  let tx

  const mc = await import(`@pancakeswap/masterchef-v3/deployed/${networkName}.json`)
  const masterchef = new ethers.Contract(mc.MasterChef, MasterChefABI, owner)
  const masterchefv2 = new ethers.Contract(mc.MasterChefV2, MasterChefV2ABI, owner)
  const masterchefv3 = new ethers.Contract(mc.MasterChefV3, MasterChefV3ABI, owner)

  const fee = await import(`@pancakeswap/fee/deployed/${networkName}.json`)
  const masterchefv3receiver = new ethers.Contract(fee.MasterChefV3Receiver, MasterChefV3ReceiverABI, owner)

  const DUMMY = config.dummy.MCV2toV3

  tx = await masterchefv2.add(1, DUMMY, false, false)
  await tx.wait(5)
  console.log('MasterChefv2 add:', tx.hash)

  const dMCV2toV3 = new ethers.Contract(DUMMY, ERC20ABI, owner)
  tx = await dMCV2toV3.approve(
    masterchefv3receiver.address,
    '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
  )
  await tx.wait(5)
  console.log('dMCV2toV3 approve:', tx.hash)

  tx = await masterchefv2.updateWhiteList(masterchefv3receiver.address, true)
  await tx.wait(5)
  console.log('masterchefv2 updateWhiteList:', tx.hash)

  tx = await masterchefv3receiver.depositForMasterChefV2Pool(DUMMY)
  await tx.wait(5)
  console.log('MasterChefV3Receiver depositForMasterChefV2Pool:', tx.hash)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
