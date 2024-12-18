"use client";

import { useState } from "react";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { uploadFileToIPFS, addToIPFS, saveNFTToDB } from "~~/utils/simpleNFT/ipfs-fetch";
// import { MyHoldings } from "./_components";
import { usePublicClient } from "wagmi";

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
      const mintTx = await writeContractAsync({
        functionName: "mintItem",
        args: [connectedAddress, uploadedItem.IpfsHash, royaltyFee],
      });

      // 从交易回执中获取返回值tokenID
      const receipt = await publicClient?.getTransactionReceipt({ hash: mintTx as `0x${string}`})
      console.log("receipt==========>", receipt);
      const nft_id = receipt?.logs[0].topics[3];
      const numericId = parseInt(nft_id as `0x${string}`, 16)
      console.log("numericId==========>" + numericId);

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

  return (
    <div className="flex flex-col items-center pt-10 px-6 max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">Create & Mint Your NFT</h1>
      <div className="flex flex-wrap justify-between w-full gap-6">
        {/* 左侧输入框部分 */}
        <div className="w-full lg:w-7/12 border border-gray-300 p-6 rounded-xl shadow-lg">
          <div className="mb-4">
            <label className="block text-lg mb-2">NFT Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input input-bordered w-full"
              placeholder="Enter NFT Name"
            />
          </div>

          <div className="mb-4">
            <label className="block text-lg mb-2">NFT Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="textarea textarea-bordered w-full"
              placeholder="Enter NFT Description"
            />
          </div>

          <div className="mb-4">
            <label className="block text-lg mb-2">Upload NFT Image</label>
            <div className="flex items-center justify-center">
              <label htmlFor="file-upload" className="btn btn-primary w-auto cursor-pointer">
                Choose Image
              </label>
              <input
                type="file"
                id="file-upload"
                onChange={handleFileChange}
                className="hidden"
              />
              {imageCID && <span className="ml-4 text-gray-500">File selected</span>}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-lg mb-2">Attributes</label>
            {attributes.map((attribute, index) => (
              <div key={index} className="flex space-x-2 mb-2">
                <input
                  type="text"
                  placeholder="Trait Type"
                  value={attribute.trait_type}
                  onChange={(e) => handleAttributeChange(index, "trait_type", e.target.value)}
                  className="input input-bordered w-full"
                />
                <input
                  type="text"
                  placeholder="Value"
                  value={attribute.value}
                  onChange={(e) => handleAttributeChange(index, "value", e.target.value)}
                  className="input input-bordered w-full"
                />
              </div>
            ))}
            <button onClick={addNewAttribute} className="btn btn-secondary mt-2">
              Add New Attribute
            </button>
          </div>

          <div className="mb-4">
            <label className="block text-lg mb-2">Royalty Fee</label>
            <input
              type="number"
              value={royaltyFee}
              onChange={handleRoyaltyFeeChange}
              className="input input-bordered w-full"
              placeholder="Enter Royalty Fee (e.g. 250 for 2.5%)"
            />
            <p className="text-sm text-gray-500 mt-1">
              Note: 250 corresponds to 2.5%, 500 is 5%, 1000 is 10%, etc.
            </p>
          </div>
        </div>

        {/* 右侧实时预览部分 */}
        <div className="w-full lg:w-4/12 border border-gray-300 p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold mb-4">NFT Preview</h2>
          {imagePreview ? (
            <img src={imagePreview} alt="NFT Preview" className="w-full h-auto mb-4 rounded-lg" />
          ) : (
            <div className="w-full h-48 bg-gray-200 flex items-center justify-center text-gray-500 mb-4">
              No Image Selected
            </div>
          )}
          <div>
            <p className="text-lg font-semibold">{name || "NFT Name"}</p>
            <p className="text-gray-600 mt-2">{description || "NFT Description"}</p>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Attributes:</h3>
            {attributes.length > 0 && attributes[0].trait_type ? (
              <ul className="list-disc list-inside">
                {attributes.map((attr, idx) => (
                  <li key={idx}>
                    {attr.trait_type}: {attr.value}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No Attributes Added</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-center mt-6">
        {!isConnected || isConnecting ? (
          <RainbowKitCustomConnectButton />
        ) : (
          <button className="btn btn-primary" onClick={handleMintItem}>
            Mint NFT
          </button>
        )}
      </div>

      {/* <MyHoldings /> */}
    </div>
  );
};

export default CreateNFTPage;
