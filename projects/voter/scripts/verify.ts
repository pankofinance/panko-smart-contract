import { verifyContract } from '@pancakeswap/common/verify'
import { configs } from '@pancakeswap/common/config'
import { ethers, network } from 'hardhat'

async function main() {
  const networkName = network.name
  const config = configs[networkName as keyof typeof configs]

  if (!config) {
    throw new Error(`No config found for network ${networkName}`)
  }
  const deployedContractsVoter = await import(`@pancakeswap/voter/deployed/${networkName}.json`)
  const mcV3DeployedContracts = await import(`@pancakeswap/masterchef-v3/deployed/${networkName}.json`)

  console.log('Verify voter')
  await verifyContract(deployedContractsVoter.VEMan, [
    ethers.constants.AddressZero,
    mcV3DeployedContracts.GainToken,
    ethers.constants.AddressZero,
  ])
  await verifyContract(deployedContractsVoter.GaugeVoting, [deployedContractsVoter.VEMan])
  await verifyContract(deployedContractsVoter.GaugeVotingAdminUtil, [])
  await verifyContract(deployedContractsVoter.GaugeVotingCalc, [deployedContractsVoter.GaugeVoting])
  await verifyContract(deployedContractsVoter.RevenueSharingPoolFactory, [deployedContractsVoter.VEMan])
  await verifyContract(deployedContractsVoter.RevenueSharingPoolGateway, [])
  // await verifyContract('0x34176E7db604EfaEdFCC3B29616D596d910dbcf6', [])
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
