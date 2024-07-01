import { verifyContract } from '@pancakeswap/common/verify'
import { sleep } from '@pancakeswap/common/sleep'
import { configs } from '@pancakeswap/common/config'
import { network } from 'hardhat'

async function main() {
  const networkName = network.name
  const config = configs[networkName as keyof typeof configs]

  if (!config) {
    throw new Error(`No config found for network ${networkName}`)
  }
  const deployedContractStableSwap = await import(`@pancakeswap/stable-swap/deployed/${networkName}.json`)

  console.log('Verify stableswap')
  await verifyContract(deployedContractStableSwap.StableSwapLPFactory, [])
  await verifyContract(deployedContractStableSwap.StableSwapTwoPoolDeployer, [])
  await verifyContract(deployedContractStableSwap.StableSwapThreePoolDeployer, [])
  await verifyContract(deployedContractStableSwap.StableSwapFactory, [
    deployedContractStableSwap.StableSwapLPFactory,
    deployedContractStableSwap.StableSwapTwoPoolDeployer,
    deployedContractStableSwap.StableSwapThreePoolDeployer,
  ])
  await verifyContract(deployedContractStableSwap.StableSwapTwoPoolInfo, [])
  await verifyContract(deployedContractStableSwap.StableSwapThreePoolInfo, [])
  await verifyContract(deployedContractStableSwap.StableSwapInfo, [
    deployedContractStableSwap.StableSwapTwoPoolInfo,
    deployedContractStableSwap.StableSwapThreePoolInfo,
  ])
  await sleep(10000)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
