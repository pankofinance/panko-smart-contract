import { verifyContract } from '@pancakeswap/common/verify'
import { network } from 'hardhat'

async function main() {
  const networkName = network.name
  const deployedContracts = await import(`@pancakeswap/v3-core/deployed/${networkName}.json`)

  console.log('Verify GainV3PoolDeployer')
  await verifyContract(deployedContracts.V3PoolDeployer)

  console.log('Verify pancakeV3Factory')
  await verifyContract(deployedContracts.V3Factory, [deployedContracts.V3PoolDeployer])

  console.log('Verify output code hash')
  await verifyContract('0xC2d8C31Bb4C482ccD05a4AAaA07efC30E308c4B0')

  console.log('Verify pool')
  await verifyContract('0xFA52D685A5Ed8Ed4da4c8DE217F7D1491cdFfef4')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
