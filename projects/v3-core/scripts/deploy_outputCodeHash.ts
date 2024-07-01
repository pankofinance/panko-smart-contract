import bn from 'bignumber.js'
import { Contract, ContractFactory, utils, BigNumber } from 'ethers'
import { ethers } from 'hardhat'

async function main() {
  const [owner] = await ethers.getSigners()

  console.log('owner', owner.address)

  const OutputCodeHash = await ethers.getContractFactory('OutputCodeHash')
  const outputCodeHash = await OutputCodeHash.deploy()
  console.log('outputCodeHash', outputCodeHash.address)

  const hash = await outputCodeHash.getInitCodeHash()
  console.log('hash: ', hash)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
