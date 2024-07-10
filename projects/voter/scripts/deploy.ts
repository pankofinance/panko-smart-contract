import { ethers, network } from 'hardhat'
import { writeFileSync } from 'fs'
import { configs } from '@pancakeswap/common/config'

const main = async () => {
  const networkName = network.name
  console.log('Deploying to network:', networkName)
  const config = configs[networkName as keyof typeof configs]
  if (!config) {
    throw new Error(`No config found for network ${networkName}`)
  }

  const mcV3DeployedContracts = await import(`@pancakeswap/masterchef-v3/deployed/${networkName}.json`)

  const VEGain = await ethers.getContractFactory('VEGain')
  let vegain = await VEGain.deploy(
    ethers.constants.AddressZero, // no need for CakePool migration
    mcV3DeployedContracts.GainToken,
    ethers.constants.AddressZero, // no need for CakePool migration,
    config.txConfig
  )
  vegain = await vegain.deployed()
  console.log('GaugeVoting deployed to:', vegain.address)

  const GaugeVoting = await ethers.getContractFactory('GaugeVoting')
  const gaugeVoting = await GaugeVoting.deploy(vegain.address)
  await gaugeVoting.deployed()
  console.log('GaugeVoting deployed to:', gaugeVoting.address)

  const GaugeVotingAdminUtil = await ethers.getContractFactory('GaugeVotingAdminUtil')
  const gaugeVotingAdminUtil = await GaugeVotingAdminUtil.deploy()
  await gaugeVotingAdminUtil.deployed()
  console.log('GaugeVotingAdminUtil deployed to:', gaugeVotingAdminUtil.address)

  const GaugeVotingCalc = await ethers.getContractFactory('GaugeVotingCalc')
  const gaugeVotingCalc = await GaugeVotingCalc.deploy(gaugeVoting.address)
  await gaugeVotingCalc.deployed()
  console.log('GaugeVotingCalc deployed to:', gaugeVotingCalc.address)

  const RevenueSharingPoolFactory = await ethers.getContractFactory('RevenueSharingPoolFactory')
  const revenueSharingPoolFactory = await RevenueSharingPoolFactory.deploy(vegain.address)
  await revenueSharingPoolFactory.deployed()
  console.log('RevenueSharingPoolFactory deployed to:', revenueSharingPoolFactory.address)

  const RevenueSharingPoolGateway = await ethers.getContractFactory('RevenueSharingPoolGateway')
  const revenueSharingPoolGateway = await RevenueSharingPoolGateway.deploy()
  await revenueSharingPoolGateway.deployed()
  console.log('RevenueSharingPoolGateway deployed to:', revenueSharingPoolGateway.address)

  let tx
  tx = await gaugeVoting.addType('V2nStable', 0)
  await tx.wait(5)
  console.log('GaugeVoting addType V2nStable:', tx.hash)
  tx = await gaugeVoting.addType('V3', 0)
  await tx.wait(5)
  console.log('GaugeVoting addType V3:', tx.hash)
  tx = await gaugeVoting.addType('PM', 0)
  await tx.wait(5)
  console.log('GaugeVoting addType PM:', tx.hash)
  tx = await gaugeVoting.addType('vegain', 0)
  await tx.wait(5)
  console.log('GaugeVoting addType vegain:', tx.hash)

  const contracts = {
    VEGain: vegain.address,
    GaugeVoting: gaugeVoting.address,
    GaugeVotingAdminUtil: gaugeVotingAdminUtil.address,
    GaugeVotingCalc: gaugeVotingCalc.address,
    RevenueSharingPoolFactory: revenueSharingPoolFactory.address,
    RevenueSharingPoolGateway: revenueSharingPoolGateway.address,
  }

  writeFileSync(`./deployed/${network.name}.json`, JSON.stringify(contracts, null, 2))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
