import GainV3FactoryArtifacts from '@pancakeswap/v3-core/artifacts/contracts/GainV3Factory.sol/GainV3Factory.json'
import GainV3PoolArtifacts from '@pancakeswap/v3-core/artifacts/contracts/GainV3Pool.sol/GainV3Pool.json'
import GainStableSwapTwoPoolArtifacts from '@pancakeswap/stable-swap/artifacts/contracts/GainStableSwapTwoPool.sol/GainStableSwapTwoPool.json'
import SmartRouterArtifacts from '@pancakeswap/smart-router/artifacts/contracts/SmartRouter.sol/SmartRouter.json'
import { ethers } from 'hardhat'

import { IERC20, IPancakeV3Factory, IPancakeV3Pool, ISmartRouter, IStableSwapPool } from '../../typechain-types'

export namespace ForkContract {
  export const useV3Pool = async (addr: string): Promise<IPancakeV3Pool> => {
    const v3Pool = (await ethers.getContractAtFromArtifact(GainV3PoolArtifacts, addr)) as IPancakeV3Pool
    return v3Pool
  }

  export const useStableTwoPool = async (addr: string): Promise<IStableSwapPool> => {
    const stablePool = (await ethers.getContractAtFromArtifact(
      GainStableSwapTwoPoolArtifacts,
      addr
    )) as IStableSwapPool
    return stablePool
  }

  export const useSmartRouter = async (addr: string): Promise<ISmartRouter> => {
    const router = (await ethers.getContractAtFromArtifact(SmartRouterArtifacts, addr)) as ISmartRouter
    return router
  }

  export const useV3Factory = async (addr: string): Promise<IPancakeV3Factory> => {
    const factory = (await ethers.getContractAtFromArtifact(GainV3FactoryArtifacts, addr)) as IPancakeV3Factory
    return factory
  }

  export const useERC20 = async (addr: string): Promise<IERC20> => {
    const erc20 = await ethers.getContractAt('IERC20', addr)
    return erc20
  }
}
