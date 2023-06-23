import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import chalk from 'chalk';
import assert from 'assert';
import path from 'path';
import { DeployProxyOptions } from '../utils/options';
import { ZkSyncUpgradablePluginError } from '../errors';
import { convertGasPriceToEth } from '../utils/utils-general';
import { BEACON_PROXY_JSON } from '../constants';

import { Deployer } from '@matterlabs/hardhat-zksync-deploy';
import { getMockedBeaconData } from './estimate-gas-beacon';

export interface EstimateBeaconGasFunction {
    (deployer: Deployer, args?: DeployProxyOptions[], opts?: DeployProxyOptions): Promise<void>;
}

export function makeEstimateGasBeaconProxy(hre: HardhatRuntimeEnvironment): EstimateBeaconGasFunction {
    // a function that goes through the same steps as deployProxy, but instead of deploying the proxy, it estimates the gas
    return async function estimateGasBeaconProxy(
        deployer: Deployer,
        args: DeployProxyOptions[] = [],
        opts: DeployProxyOptions = {}
    ) {
        const { mockedBeaconAddress, data } = await getMockedBeaconData(deployer, hre, args, opts);

        const beaconProxyPath = (await hre.artifacts.getArtifactPaths()).find((artifactPath) =>
            artifactPath.includes(path.sep + BEACON_PROXY_JSON)
        );
        assert(beaconProxyPath, 'Beacon proxy artifact not found');
        const beaconProxyContract = await import(beaconProxyPath);

        try {
            const beaconProxyGasCost = await deployer.estimateDeployFee(beaconProxyContract, [
                mockedBeaconAddress,
                data,
            ]);
            console.info(
                chalk.cyan(
                    `Deployment of the beacon proxy contract is estimated to cost: ${convertGasPriceToEth(
                        beaconProxyGasCost
                    )} ETH`
                )
            );
            console.info(chalk.cyan(`Total estimated gas cost: ${convertGasPriceToEth(beaconProxyGasCost)} ETH`));
        } catch (error: any) {
            throw new ZkSyncUpgradablePluginError(`Error estimating gas cost: ${error.reason}`);
        }
    };
}
