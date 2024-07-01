import { network } from 'hardhat'
import { verifyContract } from '@pancakeswap/common/verify'
import { configs } from '@pancakeswap/common/config'

async function main() {
  const networkName = network.name
  const config = configs[networkName as keyof typeof configs]

  if (!config) {
    throw new Error(`No config found for network ${networkName}`)
  }
  const deployedContracts_masterchef_v3 = await import(`@pancakeswap/masterchef-v3/deployed/${networkName}.json`)
  const deployedContracts_v3_lm_pool = await import(`@pancakeswap/v3-lm-pool/deployed/${networkName}.json`)

  console.log('Verify pancakeV3LmPoolDeployer')
  await verifyContract(deployedContracts_v3_lm_pool.V3LmPoolDeployer, [deployedContracts_masterchef_v3.MasterChefV3])
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
