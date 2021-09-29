const Crypt = artifacts.require("mocks/crypt.sol");
const PoolOne = artifacts.require("PoolOne");

module.exports = function (deployer) {
  // deployer.deploy(Crypt);
  deployer.deploy(PoolOne, '0x94c8B4DFEe20c64fE312CD6B062c8fd47eb9a682', '0x86c950cdf9e5c2bbecfb6878a419ba290f951341', 5000, 10, 50);
};
