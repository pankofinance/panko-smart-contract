import { network } from 'hardhat'
import { verifyContract } from '@pancakeswap/common/verify'
import { sleep } from '@pancakeswap/common/sleep'
import { configs } from '@pancakeswap/common/config'

function isAscii(str: string): boolean {
  return /^[\x00-\x7F]*$/.test(str)
}
function asciiStringToBytes32(str: string): string {
  if (str.length > 32 || !isAscii(str)) {
    throw new Error('Invalid label, must be less than 32 characters')
  }

  return '0x' + Buffer.from(str, 'ascii').toString('hex').padEnd(64, '0')
}

async function main() {
  const networkName = network.name
  const config = configs[networkName as keyof typeof configs]

  if (!config) {
    throw new Error(`No config found for network ${networkName}`)
  }
  const deployedContracts_v3_core = await import(`@pancakeswap/v3-core/deployed/${networkName}.json`)
  const deployedContracts_v3_periphery = await import(`@pancakeswap/v3-periphery/deployed/${networkName}.json`)

  console.log('Verify nftDescriptorEx')
  await verifyContract(deployedContracts_v3_periphery.NFTDescriptorEx)

  console.log('Verify nonfungibleTokenPositionDescriptor')
  await verifyContract(deployedContracts_v3_periphery.NonfungibleTokenPositionDescriptor, [
    config.WNATIVE,
    asciiStringToBytes32(config.nativeCurrencyLabel),
    deployedContracts_v3_periphery.NFTDescriptorEx,
  ])

  console.log('Verify NonfungiblePositionManager')
  await verifyContract(deployedContracts_v3_periphery.NonfungiblePositionManager, [
    deployedContracts_v3_core.V3PoolDeployer,
    deployedContracts_v3_core.V3Factory,
    config.WNATIVE,
    deployedContracts_v3_periphery.NonfungibleTokenPositionDescriptor,
  ])

  console.log('Verify mancakeInterfaceMulticallV2')
  await verifyContract(deployedContracts_v3_periphery.MulticallV2)

  console.log('Verify v3Migrator')
  await verifyContract(deployedContracts_v3_periphery.V3Migrator, [
    deployedContracts_v3_core.V3PoolDeployer,
    deployedContracts_v3_core.V3Factory,
    config.WNATIVE,
    deployedContracts_v3_periphery.NonfungiblePositionManager,
  ])

  console.log('Verify tickLens')
  await verifyContract(deployedContracts_v3_periphery.TickLens)

  console.log('Verify QuoterV2')
  await verifyContract(deployedContracts_v3_periphery.QuoterV2, [
    deployedContracts_v3_core.V3PoolDeployer,
    deployedContracts_v3_core.V3Factory,
    config.WNATIVE,
  ])

  console.log('Verify SwapRouter')
  await verifyContract(deployedContracts_v3_periphery.SwapRouter, [
    deployedContracts_v3_core.V3PoolDeployer,
    deployedContracts_v3_core.V3Factory,
    config.WNATIVE,
  ])
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
