import { network } from 'hardhat'
import { verifyContract } from '@pancakeswap/common/verify'
import { configs } from '@pancakeswap/common/config'

async function main() {
  const networkName = network.name
  const config = configs[networkName as keyof typeof configs]

  if (!config) {
    throw new Error(`No config found for network ${networkName}`)
  }

  const feeDeployedContracts = await import(`@pancakeswap/fee/deployed/${networkName}.json`)
  const mcV3DeployedContracts = await import(`@pancakeswap/masterchef-v3/deployed/${networkName}.json`)

  console.log('Verify MasterChefV3Receiver')
  await verifyContract(feeDeployedContracts.MasterChefV3Receiver, [
    mcV3DeployedContracts.MasterChefV2,
    mcV3DeployedContracts.MasterChefV3,
    mcV3DeployedContracts.GainToken,
    0,
  ])
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
