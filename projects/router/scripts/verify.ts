import { network } from 'hardhat'
import { verifyContract } from '@pancakeswap/common/verify'
import { configs } from '@pancakeswap/common/config'

async function main() {
  const networkName = network.name
  const config = configs[networkName as keyof typeof configs]

  if (!config) {
    throw new Error(`No config found for network ${networkName}`)
  }
  const deployedContracts_stableswap = await import(`@pancakeswap/stable-swap/deployed/${networkName}.json`)
  const deployedContracts_v3_core = await import(`@pancakeswap/v3-core/deployed/${networkName}.json`)
  const deployedContracts_v3_periphery = await import(`@pancakeswap/v3-periphery/deployed/${networkName}.json`)
  const deployedContracts_smart_router = await import(`@pancakeswap/smart-router/deployed/${networkName}.json`)

  // Verify SmartRouterHelper
  console.log('Verify SmartRouterHelper')
  await verifyContract(deployedContracts_smart_router.SmartRouterHelper)

  // Verify swapRouter
  console.log('Verify swapRouter')
  await verifyContract(deployedContracts_smart_router.SmartRouter, [
    config.v2Factory,
    deployedContracts_v3_core.V3PoolDeployer,
    deployedContracts_v3_core.V3Factory,
    deployedContracts_v3_periphery.NonfungiblePositionManager,
    deployedContracts_stableswap.StableSwapFactory,
    deployedContracts_stableswap.StableSwapInfo,
    config.WNATIVE,
  ])

  // Verify mixedRouteQuoterV1
  console.log('Verify mixedRouteQuoterV1')
  await verifyContract(deployedContracts_smart_router.MixedRouteQuoterV1, [
    deployedContracts_v3_core.V3PoolDeployer,
    deployedContracts_v3_core.V3Factory,
    config.v2Factory,
    deployedContracts_stableswap.StableSwapFactory,
    config.WNATIVE,
  ])

  // Verify quoterV2
  console.log('Verify quoterV2')
  await verifyContract(deployedContracts_smart_router.QuoterV2, [
    deployedContracts_v3_core.V3PoolDeployer,
    deployedContracts_v3_core.V3Factory,
    config.WNATIVE,
  ])

  // Verify tokenValidator
  console.log('Verify tokenValidator')
  await verifyContract(deployedContracts_smart_router.TokenValidator, [
    config.v2Factory,
    deployedContracts_v3_periphery.NonfungiblePositionManager,
  ])
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
