import { ethers, network, upgrades } from 'hardhat'
import * as helpers from '@nomicfoundation/hardhat-network-helpers'
import { ForkContract } from './shared/externalContracts'
import {
  IFeeHandler,
  IERC20,
  IPancakeV3Factory,
  IPancakeV3Pool,
  ISmartRouter,
  ISmartRouter__factory,
  IStableSwapPool,
} from '../typechain-types'
import { Signer } from 'ethers'
import { expect } from 'chai'
import { setEtherBalance } from './shared/hardhat'

const ADMIN = '0x7BDF85dF9186E055697C4f2803366973b491ef4a'
const OPERATOR = '0xBC75d9Ab4AB19245C38669Eb3FbA1A1fB7fEFC7D'
const ROUTER = '0xFB446ee6aa41469Be25d720F98CE44Bb2763C65A'
const USDC = '0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9'
const USDT = '0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE'
const WMNT = '0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8'
const MANCAKE = '0x1B664Ab76992Fb06cACAdBC9DDCadb097d47a812'
const V3_FACTORY = '0x66d5D0B1cC13722954326d93c5a147Bb00c3B81f'

const RECIPIENT_FEE_HANDLER = '0x0000000000000000000000000000000000000001'
const RECIPIENT_SMART_ROUTER = '0x0000000000000000000000000000000000000002'

const smartRouterFacInterface = ISmartRouter__factory.createInterface()

describe('FeeHandler', () => {
  let admin: Signer
  let operator: Signer

  let usdc: IERC20
  let usdt: IERC20
  let wmnt: IERC20
  let mancake: IERC20

  let usdcMntV3: IPancakeV3Pool
  let usdcUsdtStable: IStableSwapPool
  let v3Factory: IPancakeV3Factory
  let router: ISmartRouter

  let feeHandler: IFeeHandler

  let snapshotSetup: helpers.SnapshotRestorer

  before('setup wallets', async () => {
    admin = ethers.provider.getSigner(ADMIN)
    await network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [ADMIN],
    })

    operator = ethers.provider.getSigner(OPERATOR)
    await network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [OPERATOR],
    })

    await setEtherBalance(ADMIN, ethers.utils.parseEther('1000'))
    await setEtherBalance(OPERATOR, ethers.utils.parseEther('1000'))

    usdc = await ForkContract.useERC20(USDC)
    usdt = await ForkContract.useERC20(USDT)
    wmnt = await ForkContract.useERC20(WMNT)
    mancake = await ForkContract.useERC20(MANCAKE)
  })

  before('get forked contracts', async () => {
    usdcMntV3 = await ForkContract.useV3Pool('0x48aeae837b8ebac441ed8d00b6c5df6d3208c673')
    usdcUsdtStable = await ForkContract.useStableTwoPool('0x1940Bf7e1d84A6f1f9F90A6290189601617736cb')
    router = await ForkContract.useSmartRouter(ROUTER)
    v3Factory = await ForkContract.useV3Factory(V3_FACTORY)
  })

  before('deploy fee handler', async () => {
    const FeeHandlerFac = await ethers.getContractFactory('FeeHandler', admin)
    feeHandler = (await upgrades.deployProxy(FeeHandlerFac, [
      router.address,
      v3Factory.address,
      [OPERATOR],
      [USDC, USDT],
    ])) as IFeeHandler
    await v3Factory.connect(admin).setOwner(feeHandler.address)
    await usdcUsdtStable.connect(admin).transferOwnership(feeHandler.address)
    snapshotSetup = await helpers.takeSnapshot()
  })

  describe('collect fee', () => {
    afterEach('reset', async () => {
      await snapshotSetup.restore()
    })

    it('should collect fee v3', async () => {
      const protocolFees = await usdcMntV3.protocolFees()
      const tx = feeHandler.connect(operator).collectFeeV3([usdcMntV3.address])
      await expect(tx).to.changeTokenBalance(usdc, feeHandler.address, protocolFees.token0.sub(1))
      await expect(tx).to.changeTokenBalance(wmnt, feeHandler.address, protocolFees.token1.sub(1))
    })

    it('should collect fee stable', async () => {
      const adminFeeUsdc = await usdcUsdtStable.admin_balances(0)
      const adminFeeUsdt = await usdcUsdtStable.admin_balances(1)
      const tx = feeHandler.connect(operator).collectFeeStableSwap([usdcUsdtStable.address])
      await expect(tx).to.changeTokenBalance(usdc, feeHandler.address, adminFeeUsdc)
      await expect(tx).to.changeTokenBalance(usdt, feeHandler.address, adminFeeUsdt)
    })
  })

  describe('withdraw', () => {
    afterEach('reset', async () => {
      await snapshotSetup.restore()
    })
    it('should withdraw fee', async () => {
      await feeHandler.connect(operator).collectFeeV3([usdcMntV3.address])
      const usdcBalance = await usdc.balanceOf(feeHandler.address)
      const wmntBalance = await wmnt.balanceOf(feeHandler.address)
      const tx = feeHandler.connect(admin).withdrawMultiple([usdc.address, wmnt.address], ADMIN)
      await expect(tx).to.changeTokenBalance(usdc, ADMIN, usdcBalance)
      await expect(tx).to.changeTokenBalance(wmnt, ADMIN, wmntBalance)
    })
  })

  describe('swap', () => {
    let snapshotAfterCollect: helpers.SnapshotRestorer

    before('collect fee', async () => {
      await feeHandler.connect(operator).collectFeeV3([usdcMntV3.address])
      snapshotAfterCollect = await helpers.takeSnapshot()
    })

    afterEach('reset', async () => {
      await snapshotAfterCollect.restore()
    })

    it('should revert deadline passed', async () => {
      await expect(feeHandler.connect(admin).swapSmart(0n, [], [])).to.be.revertedWithCustomError(
        feeHandler,
        'DeadlinePassed'
      )
    })

    it('should revert invalid swap signature', async () => {
      await expect(
        feeHandler
          .connect(admin)
          .swapSmart(
            1000000000000000n,
            [ethers.constants.AddressZero],
            [smartRouterFacInterface.encodeFunctionData('WETH9')]
          )
      )
        .to.be.revertedWithCustomError(feeHandler, 'InvalidSwapSignature')
        .withArgs('0x4aa4a4fc')
    })

    it('should revert invalid recipient (admin address)', async () => {
      await expect(
        feeHandler.connect(admin).swapSmart(
          1000000000000000n,
          [usdc.address],
          [
            smartRouterFacInterface.encodeFunctionData('exactInputSingle', [
              {
                tokenIn: usdc.address,
                tokenOut: wmnt.address,
                fee: 2500n,
                recipient: ADMIN,
                amountIn: 1n,
                amountOutMinimum: 1n,
                sqrtPriceLimitX96: 0n,
              },
            ]),
          ]
        )
      )
        .to.be.revertedWithCustomError(feeHandler, 'InvalidRecipient')
        .withArgs(ADMIN)
    })

    it('should revert invalid destination (wmnt)', async () => {
      await expect(
        feeHandler.connect(admin).swapSmart(
          1000000000000000n,
          [usdc.address],
          [
            smartRouterFacInterface.encodeFunctionData('exactInputSingle', [
              {
                tokenIn: usdc.address,
                tokenOut: wmnt.address,
                fee: 2500n,
                recipient: RECIPIENT_FEE_HANDLER,
                amountIn: 1n,
                amountOutMinimum: 1n,
                sqrtPriceLimitX96: 0n,
              },
            ]),
          ]
        )
      )
        .to.be.revertedWithCustomError(feeHandler, 'InvalidDestination')
        .withArgs(wmnt.address)
    })

    it('should swap from WMNT to USDC', async () => {
      const usdcBalanceBefore = await usdc.balanceOf(feeHandler.address)
      const wmntBalanceBefore = await wmnt.balanceOf(feeHandler.address)

      const smartRouterFacInterface = ISmartRouter__factory.createInterface()
      const amountOutMin = 1n
      const tx = feeHandler.connect(admin).swapSmart(
        1000000000000000n,
        [wmnt.address],
        [
          smartRouterFacInterface.encodeFunctionData('exactInputSingle', [
            {
              tokenIn: wmnt.address,
              tokenOut: usdc.address,
              fee: 2500n,
              recipient: RECIPIENT_FEE_HANDLER,
              amountIn: wmntBalanceBefore,
              amountOutMinimum: amountOutMin,
              sqrtPriceLimitX96: 0n,
            },
          ]),
        ]
      )
      await expect(tx).to.changeTokenBalance(wmnt, feeHandler.address, wmntBalanceBefore.mul(-1))

      const usdcBalanceAfter = await usdc.balanceOf(feeHandler.address)
      const wmntBalanceAfter = await wmnt.balanceOf(feeHandler.address)

      const usdcSwappedAmount = usdcBalanceAfter.sub(usdcBalanceBefore)
      expect(usdcSwappedAmount).to.be.gt(amountOutMin)
    })

    it('should swap from USDC to USDT', async () => {
      const usdcBalanceBefore = await usdc.balanceOf(feeHandler.address)
      const usdtBalanceBefore = await usdt.balanceOf(feeHandler.address)

      const smartRouterFacInterface = ISmartRouter__factory.createInterface()
      const amountOutMin = 1n
      const tx = feeHandler.connect(admin).swapSmart(
        1000000000000000n,
        [usdc.address],
        [
          smartRouterFacInterface.encodeFunctionData('exactInputStableSwap', [
            [usdc.address, usdt.address], // path
            [2], // flags, 2=2pool, 3=3pool
            usdcBalanceBefore, // amountIn
            amountOutMin, // amountOutMinimum
            RECIPIENT_FEE_HANDLER, // to
          ]),
        ]
      )
      await expect(tx).to.changeTokenBalance(usdc, feeHandler.address, usdcBalanceBefore.mul(-1))

      const usdcBalanceAfter = await usdc.balanceOf(feeHandler.address)
      const usdtBalanceAfter = await usdt.balanceOf(feeHandler.address)

      const usdtSwappedAmount = usdtBalanceAfter.sub(usdtBalanceBefore)
      expect(usdtSwappedAmount).to.be.gt(amountOutMin)
    })

    it('should revert swap failed', async () => {
      await expect(
        feeHandler.connect(admin).swapSmart(
          1000000000000000n,
          [wmnt.address],
          [
            smartRouterFacInterface.encodeFunctionData('exactInputSingle', [
              {
                tokenIn: wmnt.address,
                tokenOut: usdc.address,
                fee: 2500n,
                recipient: RECIPIENT_FEE_HANDLER,
                amountIn: 100n,
                amountOutMinimum: 1000000n,
                sqrtPriceLimitX96: 0n,
              },
            ]),
          ]
        )
      ).to.be.revertedWithCustomError(feeHandler, 'SwapFailed')
    })
  })
})
