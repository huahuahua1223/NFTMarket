# 🚩 NFT Lab

一个功能丰富的 NFT 交易平台,基于 Scaffold-ETH 2 构建。支持 NFT 铸造、交易、租赁、碎片化、盲盒、空投、忠诚度等多种功能。平台采用最新的 Web3 技术栈,提供完整的 NFT 生态系统解决方案。

## ✨ 主要特性

### 🖼️ NFT 基础功能
- NFT 铸造: 支持图片、视频等多媒体内容
- 元数据管理: 自定义 NFT 属性和描述
- 版税设置: 支持 EIP-2981 版税标准
- IPFS 存储: 去中心化存储确保内容永久性
- 批量操作: 支持批量铸造和转移
- Gas 费用跟踪: 链下记录所有操作的 gas 消耗

### 💰 交易市场
- 灵活定价: 支持固定价格和竞拍模式
- 安全交易: 智能合约保障交易安全
- 交易历史: 完整的交易记录和追踪
- 收藏夹: 支持收藏喜欢的 NFT
- 搜索筛选: 多维度搜索和筛选功能



### 🎯 空投系统
- 白名单管理: 基于 Merkle Tree 的白名单机制
- 多轮空投: 支持设置多轮空投活动
- 空投验证: 防重复认领和身份验证
- 批量空投: 支持批量添加空投名单
- 空投追踪: 完整的空投认领记录
- 空投通知: 自动通知符合条件的用户

### 🔄 租赁系统 (ERC4907)
- 灵活租期: 自定义租赁时间和价格
- 自动归还: 租期结束自动归还
- 收益分成: 支持多方收益分配
- 使用权限: 精确的权限控制机制
- 租赁历史: 完整的租赁记录追踪

### 💎 碎片化交易
- 灵活分割: 自定义碎片化比例
- 碎片交易: 独立的碎片交易市场
- 重组机制: 支持碎片重组为完整 NFT
- 收益分配: 合理的收益分配机制
- 碎片追踪: 完整的碎片流转记录

### 📦 盲盒系统
- 盲盒创建: 支持多种配置
- 开箱动画: 精美的开箱动画效果

### 🏆 忠诚度系统
- 时间奖励: 基于持有时间的奖励机制

## 🛠 技术架构

### 前端技术
- **框架**: Next.js 13 (App Router)
- **样式**: TailwindCSS
- **Web3**: wagmi + viem
- **状态管理**: Zustand
- **UI组件**: daisyUI
- **动画**: Framer Motion

### 智能合约
- **开发框架**: Hardhat
- **合约标准**: ERC721, ERC4907
- **测试框架**: Chai
- **部署工具**: hardhat-deploy
- **合约验证**: Etherscan 验证

### 存储方案
- **链下存储**: IPFS (通过 Pinata)，MySQL数据库
- **元数据**: IPFS JSON
- **媒体文件**: IPFS 分布式存储

### 开发工具
- **代码规范**: ESLint + Prettier
- **类型检查**: TypeScript
- **测试覆盖**: solidity-coverage
- **Gas 分析**: hardhat-gas-reporter

## 🚀 快速开始

### 环境准备
- Node.js >= 18.17
- Yarn >= 1.22
- Git

### 1. 克隆项目
```bash
git clone <repository-url>
cd <project-name>
```

### 2. 安装依赖
```bash
yarn install
```

### 3. 环境配置
复制并配置环境变量:
```bash
cp packages/hardhat/.env.example packages/hardhat/.env
cp packages/nextjs/.env.example packages/nextjs/.env.local
```

### 4. 启动开发环境
```bash
# 终端 1: 启动本地区块链
yarn chain

# 终端 2: 部署合约
yarn deploy

# 终端 3: 启动前端
yarn start
```

## 📝 项目结构

```
packages/
├── hardhat/                # 智能合约开发
│   ├── contracts/         # 合约源码
│   ├── deploy/           # 部署脚本
│   └── test/            # 测试文件
│
└── nextjs/                # 前端应用
    ├── app/              # 页面组件
    ├── components/       # 通用组件
    ├── hooks/           # 自定义 Hooks
    └── utils/           # 工具函数
```

## 🔍 主要合约

### YourCollectible.sol
- NFT 主合约
- 实现 ERC721 标准
- 包含铸造、交易、空投、租赁、盲盒、忠诚度等核心功能
- 支持版税设置
- 实现碎片化逻辑

### IERC4907.sol
- NFT 租赁标准接口
- 定义租赁相关事件和方法
- 实现用户权限管理

## 📚 更多文档

- [合约文档](./docs/contracts.md)
- [API 文档](./docs/api.md)
- [部署指南](./docs/deployment.md)

## 🤝 如何贡献

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交改动 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- [Scaffold-ETH 2](https://github.com/scaffold-eth/scaffold-eth-2)
- [OpenZeppelin](https://github.com/OpenZeppelin/openzeppelin-contracts)
- [wagmi](https://wagmi.sh/)
