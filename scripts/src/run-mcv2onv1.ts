import { ethers, network } from 'hardhat'
import { abi as ERC20ABI } from '@openzeppelin/contracts/build/contracts/IERC20.json'

import { abi as MasterChefABI } from '@pancakeswap/masterchef-v3/artifacts/contracts/MasterChef.sol/MasterChef.json'
import { abi as MasterChefV2ABI } from '@pancakeswap/masterchef-v3/artifacts/contracts/MasterChefV2.sol/MasterChefV2.json'
import { abi as MasterChefV3ABI } from '@pancakeswap/masterchef-v3/artifacts/contracts/MasterChefV3.sol/MasterChefV3.json'
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

  const DUMMY = config.dummy.MCV1toV2

  tx = await masterchef.set(0, 0, false)
  await tx.wait(5)
  console.log('MasterChef set initial pool to zero:', tx.hash)

  tx = await masterchef.add(1, DUMMY, false)
  await tx.wait(5)
  console.log('MasterChef add mcv2:', tx.hash)

  const dMCV1toV2 = new ethers.Contract(DUMMY, ERC20ABI, owner)
  tx = await dMCV1toV2.approve(
    masterchefv2.address,
    '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
  )
  await tx.wait(5)
  console.log('dMCV1toV2 approve:', tx.hash)

  tx = await masterchefv2.init(dMCV1toV2.address)
  await tx.wait(5)
  console.log('MasterChefV2 init:', tx.hash)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
