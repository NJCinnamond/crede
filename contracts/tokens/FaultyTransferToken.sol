// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract FaultyTransferToken is ERC20 {
    error FaultyTransferToken__TransferFailed();

    constructor() ERC20("MockToken", "MTK") { }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }

    function transfer(address to, uint256 value) public override returns (bool) {
        revert FaultyTransferToken__TransferFailed();
    }
}
