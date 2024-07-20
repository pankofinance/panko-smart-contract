import { ethers } from 'hardhat'
import PancakeV3PoolArtifact from '../artifacts/contracts/SwapLabsV3Pool.sol/SwapLabsV3Pool.json'

const hash = ethers.utils.keccak256(PancakeV3PoolArtifact.bytecode)
console.log(hash)
