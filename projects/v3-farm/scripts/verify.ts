import { network } from 'hardhat'
import { verifyContract } from '@pancakeswap/common/verify'
import { configs } from '@pancakeswap/common/config'

export const cA = 50000n
export const cB = 4000n

async function main() {
  const networkName = network.name
  const config = configs[networkName as keyof typeof configs]

  if (!config) {
    throw new Error(`No config found for network ${networkName}`)
  }

  const voterDeployedContracts = await import(`@pancakeswap/voter/deployed/${networkName}.json`)
  const mcV3DeployedContracts = await import(`@pancakeswap/masterchef-v3/deployed/${networkName}.json`)
  const farmDeployedContracts = await import(`@pancakeswap/v3-farm/deployed/${networkName}.json`)

  console.log('Verify farm booster')
  await verifyContract(farmDeployedContracts.FarmBooster, [
    voterDeployedContracts.VEGain,
    mcV3DeployedContracts.MasterChefV3,
    cA,
    cB,
  ])
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
