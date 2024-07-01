import { BigNumber } from 'ethers'
import { ethers, network } from 'hardhat'

export const setEtherBalance = async (addr: string, amount: BigNumber) => {
  await network.provider.send('hardhat_setBalance', [addr, ethers.utils.hexStripZeros(amount.toHexString())])
}

export const resetHardhat = async () => {
  await network.provider.send('hardhat_reset')
}
