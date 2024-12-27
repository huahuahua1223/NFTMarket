"use client";

import { useState } from "react";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { uploadFileToIPFS, addToIPFS, saveNFTToDB, saveGasRecord } from "~~/utils/simpleNFT/ipfs-fetch";
// import { MyHoldings } from "./_components";
import { usePublicClient } from "wagmi";
import { motion } from "framer-motion";

const CreateNFTPage: NextPage = () => {
  const { address: connectedAddress, isConnected, isConnecting } = useAccount();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageCID, setImageCID] = useState<string | null>(null); // 存储图片的 CID
  const [attributes, setAttributes] = useState([{ trait_type: "", value: "" }]);
  const [royaltyFee, setRoyaltyFee] = useState(250); // 用于存储版税费率
  const { writeContractAsync } = useScaffoldWriteContract("YourCollectible");

  const publicClient = usePublicClient();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [batchFiles, setBatchFiles] = useState<File[]>([]); // 存储批量上传的文件
  const [batchPreviews, setBatchPreviews] = useState<string[]>([]); // 存储批量预览图片
  const [isBatchMode, setIsBatchMode] = useState(false); // 控制是否为批量模式
  const [batchImageCIDs, setBatchImageCIDs] = useState<string[]>([]); // 存储批量上传的图片CID

  // 添加装饰性配置
  const floatingIcons = [
    { icon: "🎨", delay: 0 },
    { icon: "✨", delay: 1 },
    { icon: "🖼️", delay: 2 },
    { icon: "🎭", delay: 3 },
    { icon: "🌟", delay: 4 },
  ];

  const particles = Array.from({ length: 30 }).map((_, i) => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: 2 + Math.random() * 3,
    delay: Math.random() * 2,
  }));

  // 处理文件上传
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const notificationId = notification.loading("Uploading image to IPFS...");

    try {
      const uploadedFile = await uploadFileToIPFS(selectedFile);
      notification.remove(notificationId);

      if (uploadedFile && uploadedFile.IpfsHash) {
        console.log("IpfsHash==========>", uploadedFile.IpfsHash);
        setImageCID(uploadedFile.IpfsHash); // 将 IPFS CID 设置到状态
        notification.success("Image uploaded to IPFS successfully!");
        setImagePreview(URL.createObjectURL(selectedFile));
      } else {
        notification.error("Failed to upload image to IPFS.");
      }
    } catch (error) {
      notification.remove(notificationId);
      notification.error("Failed to upload image.");
      console.error(error);
    }
  };

  const handleAttributeChange = (index: number, field: string, value: string) => {
    const newAttributes = [...attributes];
    newAttributes[index] = { ...newAttributes[index], [field]: value };
    setAttributes(newAttributes);
  };

  // 添加新属性
  const addNewAttribute = () => {
    setAttributes([...attributes, { trait_type: "", value: "" }]);
  };

  // 删除属性
  const removeAttribute = (index: number) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  // 铸造NFT
  const handleMintItem = async () => {
    if (!imageCID || !name || !description) {
      notification.error("Please provide all required information.");
      return;
    }

    const metadata = {
      name,
      description,
      image: `https://aqua-famous-koala-370.mypinata.cloud/ipfs/${imageCID}`, // 使用 IPFS 的 CID 链接
      attributes,
    };

    const notificationId = notification.loading("Uploading metadata to IPFS...");
    try {
      // 上传到 metadata 到IPFS
      const uploadedItem = await addToIPFS(metadata);
      notification.remove(notificationId);
      notification.success("Metadata uploaded to IPFS");

      // 调用智能合约铸造 NFT
      const tx = await writeContractAsync({
        functionName: "mintItem",
        args: [connectedAddress, uploadedItem.IpfsHash, royaltyFee],
      });

      // 等待交易被确认并获取回执
      const receipt = await publicClient?.getTransactionReceipt({ 
        hash: tx as `0x${string}` 
      });

      // 保存gas记录
      await saveGasRecord({
        tx_hash: receipt?.transactionHash,
        method_name: 'mintItem',
        gas_used: receipt?.gasUsed,
        gas_price: receipt?.effectiveGasPrice,
        total_cost: BigInt(receipt?.gasUsed * receipt?.effectiveGasPrice),
        user_address: connectedAddress as string,
        block_number: receipt?.blockNumber
      });

      // 从交易回执中获取返回值tokenID
      const nft_id = receipt?.logs[0].topics[3];
      const numericId = parseInt(nft_id as `0x${string}`, 16);

      const mint_item = new Date();
      // 转换到UTC+8
      mint_item.setHours(mint_item.getHours() + 8);  // 这里将时间调整为东八区（UTC+8）
      const mint_item_str = mint_item.toISOString().slice(0, 19).replace('T', ' ');

      // 保存到数据库
      if(nft_id) {
        const data = {
          nft_id: numericId,
          token_uri: uploadedItem.IpfsHash,
          mint_item: mint_item_str,
          owner: connectedAddress,
          state: 0,
          royaltyFeeNumerator: royaltyFee,
        };
        await saveNFTToDB(data);
      }

      notification.success("NFT Minted successfully!");
    } catch (error) {
      notification.remove(notificationId);
      notification.error("Failed to mint NFT.");
      console.error(error);
    }
  };

  // 更新版税费率的处理函数
const handleRoyaltyFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = Number(e.target.value);
  if (value <= 1000) {
    setRoyaltyFee(value); // 只有当值不超过1000时才更新
  } else {
    notification.error("版税不能超过10%~");
  }
};

  // 处理批量文件上传 - 立即上传到 IPFS
  const handleBatchFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (files.length > 50) {
      notification.error("Maximum 50 files can be uploaded at once");
      return;
    }

    setBatchFiles(files);
    
    // 生成预览
    const previews = files.map(file => URL.createObjectURL(file));
    setBatchPreviews(previews);

    // 立即上传图片到 IPFS
    const notificationId = notification.loading("Uploading images to IPFS...");
    try {
      const cids: string[] = [];
      for (const file of files) {
        const uploadedFile = await uploadFileToIPFS(file);
        if (uploadedFile && uploadedFile.IpfsHash) {
          cids.push(uploadedFile.IpfsHash);
        }
      }
      setBatchImageCIDs(cids);
      notification.remove(notificationId);
      notification.success(`Successfully uploaded ${cids.length} images to IPFS`);
    } catch (error) {
      notification.remove(notificationId);
      notification.error("Failed to upload images to IPFS");
      console.error(error);
    }
  };

  // 批量铸造NFT - 只处理元数据上传和合约调用
  const handleBatchMint = async () => {
    if (batchImageCIDs.length === 0) {
      notification.error("Please upload images first");
      return;
    }

    const notificationId = notification.loading("Creating metadata and minting NFTs...");

    try {
      const uris: string[] = [];
      
      // 为每个图片创建并上传元数据到IPFS
      for (let i = 0; i < batchImageCIDs.length; i++) {
        const metadata = {
          name: `${name} #${i + 1}`,
          description,
          image: `https://aqua-famous-koala-370.mypinata.cloud/ipfs/${batchImageCIDs[i]}`,
          attributes,
        };

        // 上传metadata到IPFS
        const uploadedMetadata = await addToIPFS(metadata);
        uris.push(uploadedMetadata.IpfsHash);
      }

      notification.remove(notificationId);
      notification.success("Metadata created and uploaded to IPFS");

      // 调用智能合约的批量铸造函数
      const tx = await writeContractAsync({
        functionName: "batchMintItems",
        args: [connectedAddress, uris, BigInt(royaltyFee)],
      });

      // 等待交易被确认并获取回执
      const receipt = await publicClient?.getTransactionReceipt({ 
        hash: tx as `0x${string}` 
      });

      // 保存gas记录
      await saveGasRecord({
        tx_hash: receipt?.transactionHash,
        method_name: 'batchMintItems',
        gas_used: receipt?.gasUsed,
        gas_price: receipt?.effectiveGasPrice,
        total_cost: BigInt(receipt?.gasUsed * receipt?.effectiveGasPrice),
        user_address: connectedAddress as string,
        block_number: receipt?.blockNumber
      });
      
      // 保存到数据库
      if (receipt) {
        const mint_item = new Date();
        mint_item.setHours(mint_item.getHours() + 8);
        const mint_item_str = mint_item.toISOString().slice(0, 19).replace('T', ' ');

        // 处理每个铸造的NFT
        for (let i = 0; i < uris.length; i++) {
          const data = {
            nft_id: receipt.logs[i].topics[3] ? parseInt(receipt.logs[i].topics[3] as string, 16) : i + 1,
            token_uri: uris[i],
            mint_item: mint_item_str,
            owner: connectedAddress,
            state: 0,
            royaltyFeeNumerator: royaltyFee,
          };
          await saveNFTToDB(data);
        }
      }

      notification.success(`Successfully minted ${uris.length} NFTs!`);
      
      // 清理状态
      setBatchFiles([]);
      setBatchPreviews([]);
      setBatchImageCIDs([]);
      setIsBatchMode(false);
    } catch (error) {
      notification.error("Failed to batch mint NFTs");
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-300 via-base-100 to-base-300 relative overflow-hidden">
      {/* 动态粒子背景 */}
      {particles.map((particle, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-primary/30 rounded-full"
          animate={{
            x: ["0%", `${particle.x}%`, "0%"],
            y: ["0%", `${particle.y}%`, "0%"],
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* 渐变光晕背景 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-[500px] h-[500px] -top-48 -left-48 bg-primary/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute w-[500px] h-[500px] -bottom-48 -right-48 bg-secondary/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute w-[300px] h-[300px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-accent/10 rounded-full blur-[100px] animate-pulse" />
      </div>

      {/* 添加浮动图标 */}
      {floatingIcons.map((item, index) => (
        <motion.div
          key={index}
          className="absolute text-4xl"
          initial={{ opacity: 0, y: 100 }}
          animate={{
            opacity: [0, 1, 0],
            y: [-20, -100, -20],
            x: [Math.random() * 100, Math.random() * -100, Math.random() * 100],
          }}
          transition={{
            duration: 5,
            delay: item.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
        >
          {item.icon}
        </motion.div>
      ))}

      <motion.div 
        className="relative z-10 flex flex-col items-center pt-10 px-6 max-w-6xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* 标题部分增强 */}
        <motion.div 
          className="text-center mb-8 relative"
          whileHover={{ scale: 1.02 }}
        >
          <motion.div
            animate={{
              scale: [1, 1.02, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 blur-3xl"
          />
          <h1 className="text-5xl font-bold mb-4 relative">
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent 
              drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]">
              铸造你的NFT
            </span>
          </h1>
          <p className="text-xl text-base-content/70">
            创造独特的数字艺术作品
          </p>
        </motion.div>

        {/* 创建提示卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full mb-8 bg-base-100/50 backdrop-blur-md rounded-3xl p-6 shadow-xl border border-base-content/5"
        >
          <div className="flex items-start gap-4">
            <div className="text-3xl">💡</div>
            <div>
              <h3 className="text-lg font-bold mb-2">创建指南</h3>
              <ul className="space-y-2 text-base-content/70">
                <motion.li
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-center gap-2"
                >
                  <span className="text-primary">•</span>
                  为您的 NFT 添加独特的名称和描述
                </motion.li>
                <motion.li
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center gap-2"
                >
                  <span className="text-primary">•</span>
                  上传高质量的图片文件
                </motion.li>
                <motion.li
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center gap-2"
                >
                  <span className="text-primary">•</span>
                  设置合理的版税比例
                </motion.li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* 现有的主要内容包装在动画容器中 */}
        <motion.div 
          className="flex flex-wrap justify-between w-full gap-6"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1 }
          }}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {/* 左侧输入框部分 */}
          <div className="w-full lg:w-7/12 border border-gray-300 p-6 rounded-xl shadow-lg">
            {/* NFT名称输入 */}
            <div className="mb-6">
              <label className="block text-xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                NFT 名称
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input input-bordered w-full bg-base-200 pr-10 transition-all hover:bg-base-300 focus:ring-2 focus:ring-primary"
                  placeholder="为你的NFT起个独特的名字"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 2a1 1 0 00-1 1v1.323l3.954 1.582L14.5 4.82a1 1 0 100 2.36l-1.546-1.083L9 7.679V15a1 1 0 102 0V9.322l3.954-1.582L16.5 8.82a1 1 0 100-2.36l-1.546-1.083L11 3.797V3a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </span>
              </div>
            </div>

            {/* NFT描述输入 */}
            <div className="mb-6">
              <label className="block text-xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                NFT 描述
              </label>
              <div className="relative">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="textarea textarea-bordered w-full h-32 bg-base-200 transition-all hover:bg-base-300 focus:ring-2 focus:ring-primary"
                  placeholder="描述一下你的NFT特色..."
                />
                <span className="absolute right-3 top-3 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V4H6z" clipRule="evenodd" />
                  </svg>
                </span>
              </div>
            </div>

            {/* 图片上传部分 */}
            <div className="mb-6">
              <label className="block text-xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                {isBatchMode ? '批量上传图片' : '上传图片'}
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center transition-all hover:border-primary">
                <div className="flex flex-col items-center">
                  <label htmlFor={isBatchMode ? "batch-file-upload" : "file-upload"} className="cursor-pointer">
                    <div className="mb-4">
                      <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="flex text-sm text-gray-600">
                      <p className="pl-1">
                        {isBatchMode ? '点击上传多个图片（最多50个）' : '点击上传图片或拖放文件到这里'}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      支持 PNG, JPG, GIF 等格式
                    </p>
                  </label>
                  <input
                    type="file"
                    id={isBatchMode ? "batch-file-upload" : "file-upload"}
                    onChange={isBatchMode ? handleBatchFileChange : handleFileChange}
                    className="hidden"
                    accept="image/*"
                    multiple={isBatchMode}
                  />
                </div>

                {/* 批量预览 */}
                {isBatchMode && (
                  <div className="mt-4">
                    {batchPreviews.length > 0 && (
                      <div className="grid grid-cols-3 gap-4">
                        {batchPreviews.map((preview, index) => (
                          <div key={index} className="relative">
                            <img
                              src={preview}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg"
                            />
                            {batchImageCIDs[index] && (
                              <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 text-sm text-gray-500">
                      {batchImageCIDs.length > 0 ? (
                        <span className="text-green-500">✓ {batchImageCIDs.length} images uploaded to IPFS</span>
                      ) : (
                        <span>Waiting for image upload...</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 添加属性设置部分 */}
          <div className="w-full max-w-3xl border border-gray-300 p-6 rounded-xl shadow-lg mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">NFT 属性设置</h2>
              <button
                className="btn btn-primary btn-sm"
                onClick={addNewAttribute}
              >
                添加属性
              </button>
            </div>
            
            <div className="space-y-4">
              {attributes.map((attr, index) => (
                <div key={index} className="flex gap-4 items-start">
                  <div className="form-control flex-1">
                    <label className="label">
                      <span className="label-text">属性名称</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={attr.trait_type}
                      onChange={(e) => handleAttributeChange(index, 'trait_type', e.target.value)}
                      placeholder="例如: 背景"
                    />
                  </div>
                  
                  <div className="form-control flex-1">
                    <label className="label">
                      <span className="label-text">属性值</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={attr.value}
                      onChange={(e) => handleAttributeChange(index, 'value', e.target.value)}
                      placeholder="例如: 蓝色"
                    />
                  </div>

                  <button
                    className="btn btn-square btn-error btn-sm mt-9"
                    onClick={() => removeAttribute(index)}
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          </div>

            <div className="mb-4">
              <label className="block text-lg mb-2">版税比例</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={royaltyFee / 100}
                  onChange={e => {
                    const value = Math.round(parseFloat(e.target.value) * 100);
                    if (!isNaN(value) && value >= 0 && value <= 1000) {
                      setRoyaltyFee(value);
                    }
                  }}
                  className="input input-bordered flex-1"
                  placeholder="输入版税比例"
                  step="any"
                  min="0"
                  max="10"
                />
                <span className="text-lg">%</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                版税比例范围: 0% - 10%
              </p>
            </div>
          </div>

          {/* 右侧预览部分 */}
          <div className="w-full lg:w-4/12 border border-gray-300 p-6 rounded-xl shadow-lg bg-base-100">
            <h2 className="text-xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              NFT 预览
            </h2>
            
            {isBatchMode ? (
              // 批量模式预览
              <div className="space-y-4">
                {batchPreviews.length > 0 ? (
                  batchPreviews.slice(0, 3).map((preview, index) => (
                    <div key={index} className="border rounded-xl p-4 shadow-inner bg-base-200">
                      <img 
                        src={preview} 
                        alt={`NFT Preview ${index + 1}`} 
                        className="w-full h-auto mb-4 rounded-lg shadow-md transition-transform hover:scale-105" 
                      />
                      <div className="space-y-3">
                        <p className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                          {name ? `${name} #${index + 1}` : "等待输入名称..."}
                        </p>
                        <p className="text-gray-600 text-sm">
                          {description || "等待输入描述..."}
                        </p>
                      </div>
                      {attributes.length > 0 && attributes[0].trait_type && (
                        <div className="mt-4">
                          <h3 className="text-lg font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                            属性列表:
                          </h3>
                          <div className="grid grid-cols-2 gap-2">
                            {attributes.map((attr, idx) => (
                              <div key={idx} className="bg-base-300 rounded-lg p-2 text-sm">
                                <span className="font-semibold">{attr.trait_type}:</span> {attr.value}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500">
                    请选择图片进行预览
                  </div>
                )}
                {batchPreviews.length > 3 && (
                  <div className="text-center text-gray-500 mt-4">
                    还有 {batchPreviews.length - 3} 个预览未显示...
                  </div>
                )}
              </div>
            ) : (
              // 单个模式预览 (保持原有的预览代码)
              <div className="border rounded-xl p-4 shadow-inner bg-base-200">
                {imagePreview ? (
                  <img 
                    src={imagePreview} 
                    alt="NFT Preview" 
                    className="w-full h-auto mb-4 rounded-lg shadow-md transition-transform hover:scale-105" 
                  />
                ) : (
                  <div className="w-full h-48 bg-base-300 rounded-lg flex items-center justify-center text-gray-500 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <div className="space-y-3">
                  <p className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    {name || "等待输入名称..."}
                  </p>
                  <p className="text-gray-600 text-sm">
                    {description || "等待输入描述..."}
                  </p>
                </div>
                <div className="mt-4">
                  <h3 className="text-lg font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    属性列表:
                  </h3>
                  {attributes.length > 0 && attributes[0].trait_type ? (
                    <div className="grid grid-cols-2 gap-2">
                      {attributes.map((attr, idx) => (
                        <div key={idx} className="bg-base-300 rounded-lg p-2 text-sm">
                          <span className="font-semibold">{attr.trait_type}:</span> {attr.value}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">暂无属性</p>
                  )}
                </div>
              </div>
            )}
          </div>
          </motion.div>

        {/* 添加批量模式切换按钮 */}
        <div className="w-full flex justify-end mb-4">
          <button
            className={`btn ${isBatchMode ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setIsBatchMode(!isBatchMode)}
          >
            {isBatchMode ? '切换到单个铸造' : '切换到批量铸造'}
          </button>
        </div>

        <div className="flex justify-center mt-6">
          {!isConnected || isConnecting ? (
            <RainbowKitCustomConnectButton />
          ) : (
            <button 
              className="btn btn-primary" 
              onClick={isBatchMode ? handleBatchMint : handleMintItem}
            >
              {isBatchMode ? 'Batch Mint NFTs' : 'Mint NFT'}
            </button>
          )}
        </div>

        {/* <MyHoldings /> */}
      </motion.div>

      {/* 底部装饰 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mt-12 text-center text-base-content/50"
      >
        <div className="flex justify-center gap-4 mb-4">
          {["🎨", "🖼️", "🎭", "✨", "🌟"].map((emoji, index) => (
            <motion.span
              key={index}
              animate={{
                y: [0, -10, 0],
              }}
              transition={{
                duration: 2,
                delay: index * 0.2,
                repeat: Infinity,
              }}
              className="text-2xl"
            >
              {emoji}
            </motion.span>
          ))}
        </div>
        <p className="text-sm">让您的创意在区块链上永存</p>
      </motion.div>
    </div>
  );
};

export default CreateNFTPage;
