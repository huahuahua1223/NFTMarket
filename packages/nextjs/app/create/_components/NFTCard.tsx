import { useState, useEffect } from "react";
import { Collectible } from "./MyHoldings";
import { Address, AddressInput } from "~~/components/scaffold-eth";
import { useScaffoldWriteContract, useScaffoldReadContract, useScaffoldContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { parseEther } from "viem";
import { Ether } from "@uniswap/sdk-core";

export const NFTCard = ({ nft }: { nft: Collectible }) => {
  const [transferToAddress, setTransferToAddress] = useState("");
  const [isListed, setIsListed] = useState(false);
  const [price, setPrice] = useState<string>(""); // 用于存储用户输入的价格
  const [loading, setLoading] = useState(false); // 控制上架按钮的加载状态

  const { writeContractAsync } = useScaffoldWriteContract("YourCollectible");
  const { data: yourCollectibleContract } = useScaffoldContract({
    contractName: "YourCollectible",
  });

  const { data: nftItem } = useScaffoldReadContract({
    contractName: "YourCollectible",
    functionName: "getNFTItemByTokenId",
    args: [BigInt(nft.id.toString())],
    watch: true,
  });

  useEffect(() => {
    if (nftItem) {
      setIsListed(nftItem.isListed as boolean);
      setPrice(BigInt(nftItem.price).toString());
    } else {
      setIsListed(false);
      setPrice("");
    }
  }, [nftItem]);

  // 上架
  const handleListNFT = async () => {
    if (!price || isNaN(Number(price)) || Number(price) <= 0) {
      notification.error("Please enter a valid price");
      return;
    }

    console.log("价格:", price);
    const priceWei = parseEther(price); // 将 ETH 转换为 wei
    console.log("价格 (wei):", priceWei);

    // 0.025 ETH 手续费，使用 parseEther 转换为 wei
    const listingFee = parseEther("0.025"); // 转换 0.025 ETH 为 wei

    try {
      setLoading(true);

      await writeContractAsync({
        functionName: "listItem",
        args: [BigInt(nft.id), priceWei],
        value: listingFee, // 发送手续费
      });

      notification.success("NFT listed successfully!");
    } catch (error) {
      console.error(error);
      notification.error("Listing failed");
    } finally {
      setLoading(false);
    }
  };

  // 下架
  const handleUnlistNFT = async () => {
    console.log("下架 NFT:", nft.id);
    try {
      await writeContractAsync({
        functionName: "unlistNft",
        args: [BigInt(nft.id.toString())],
      });
    } catch (err) {
      console.error("Error calling unlistNft function");
    }
  };

  return (
    <div className="card card-compact bg-base-100 shadow-lg w-[300px] shadow-secondary">
      <figure className="relative">
        {/* eslint-disable-next-line  */}
        <img src={nft.image} alt="NFT Image" className="h-60 min-w-full" />
        <figcaption className="glass absolute bottom-4 left-4 p-4 w-25 rounded-xl">
          <span className="text-white "># {nft.id}</span>
        </figcaption>
      </figure>
      <div className="card-body space-y-3">
        <div className="flex items-center justify-center">
          <p className="text-xl p-0 m-0 font-semibold">{nft.name}</p>
          <div className="flex flex-wrap space-x-2 mt-1">
            {nft.attributes?.map((attr, index) => (
              <span key={index} className="badge badge-primary py-3">
                {attr.value}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col justify-center mt-1">
          <p className="my-0 text-lg">{nft.description}</p>
        </div>
        <div className="flex space-x-3 mt-1 items-center">
          <span className="text-lg font-semibold">Owner : </span>
          <Address address={nft.owner as `0x${string}`} />
        </div>

        {/* 上架功能 */}
        {/* <div className="flex flex-col my-2 space-y-1">
          <span className="text-lg font-semibold mb-1">Price (ETH): </span>
          <input
            type="text"
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="Enter price in Wei"
            className="input input-bordered"
          />
        </div>
        <div className="card-actions justify-end space-x-3">
          <button
            className="btn btn-primary btn-md px-8 tracking-wide"
            onClick={handleListNFT}
            disabled={loading}
          >
            {loading ? "Listing..." : "List NFT"}
          </button>
        </div> */}
        
        {/* 转移功能 */}
        <div className="flex flex-col my-2 space-y-1">
          <span className="text-lg font-semibold mb-1">Transfer To: </span>
          <AddressInput
            value={transferToAddress}
            placeholder="receiver address"
            onChange={newValue => setTransferToAddress(newValue)}
          />
        </div>
        <div className="card-actions justify-end">
          <button
            className="btn btn-secondary btn-md px-8 tracking-wide"
            onClick={() => {
              try {
                writeContractAsync({
                  functionName: "transferFrom",
                  args: [nft.owner as `0x${string}`, transferToAddress as `0x${string}`, BigInt(nft.id.toString())],
                });
              } catch (err) {
                console.error("Error calling transferFrom function");
              }
            }}
          >
            Send
          </button>

          {/* 上架功能 */}
          {!isListed && (
            <div className="flex items-center my-2 space-x-3">
              <span className="text-lg font-semibold">Price(ETH)</span>
              <input
                type="text"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="input input-xs rounded-lg shadow-sm w-20 px-1 py-0.5"
                placeholder="Enter price"
              />
              <button
                className="btn btn-primary btn-sm px-4 py-1"
                onClick={handleListNFT}
              >
                上架
              </button>
            </div>
          )}

          {/* 下架功能 */}
          {isListed && (
            <div className="flex items-center my-2 space-x-3">
              <span className="text-lg font-semibold">Price(ETH):{price}</span>
              <button
                className="btn btn-primary btn-sm px-4 py-1"
                onClick={handleUnlistNFT}
              >
                下架
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
