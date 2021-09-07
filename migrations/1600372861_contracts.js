const Crypt = artifacts.require("mocks/crypt.sol");
const PoolOne = artifacts.require("PoolOne");

module.exports = function (deployer) {
  deployer.deploy(Crypt);
  // deployer.deploy(PoolOne);
};
