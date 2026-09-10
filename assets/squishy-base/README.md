<!-- This document explains the palm-style doll redesign, regeneration, and preserved asset contracts. -->
# Palm Collectible Squishy · 黑衣男生 v2

本次仅重新设计基础人偶的 mesh 外观、比例和穿搭，未修改网页或加入交互／物理功能。旧版资产包保留在上一级目录 `squishy_base_v1_backup.zip`。

## 外观

约 **2.7 头身**，超大圆头、短躯干、短四肢，肩线柔和、脖子弱化。黑色蓬松短发、小巧的深色眼睛、自然平眉、中性表情。纯黑宽松短袖 T-shirt、纯黑长裤、白色运动鞋；没有 logo、图案、帽子、抽绳、口袋或默认配饰。

所有材质为纯色 PBR，皮肤使用柔软硅胶参数，头发与衣物使用柔和的哑光表面，没有布纹或写实发丝贴图。预览为 Blender 实际渲染。

## 文件

- `squishy_base.glb`：新版默认角色。
- `squishy_base.blend`：可编辑 Blender 工程，内嵌完整生成脚本。
- `generate_squishy.py`：完整独立 `bpy` 脚本。
- `preview.png`、`front.png`、`back.png`：外观检查图。
- `pose_check.png`：关节姿态检查。
- `morph_contact_sheet.png`：默认状态和全部形变对照。
- `asset_contract.json`：部件、骨骼、坐标和初始碰撞体拟合信息。
- `glasses_soft_square.glb`：为保持已有模块系统而保留的可选眼镜，不出现在默认角色中，已适配新比例。
- `validate_asset.mjs`、`inspect_squishy.py`：导出、拓扑、比例与姿态检查脚本。
- `validation_report.json`、`topology_report.json`、`*_gltf_validation.json`：检查结果。
- `squishy_base_asset_pack.zip`：完整新版资产包。

## 生成与修改

已在 Blender 5.2.1 LTS 实际执行。仅依赖 Blender 自带的 Python、bpy、bmesh 和 mathutils。

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background \
  --python assets/squishy-base/generate_squishy.py
```

其他系统将可执行文件路径换成 `blender`。也可以在 Blender Scripting 工作区打开脚本运行。**生成会清空当前场景并覆盖输出目录的同名文件，请使用新工程。**

```sh
blender --background --python generate_squishy.py -- --output-dir /absolute/output --skip-render
```

脚本的 `PALETTE` 控制材质颜色与粗糙度；`HEIGHT_MAP` 和 `proportion()` 控制统一比例；`build_character()` 定义圆头、五官、发型、T-shirt、裤子与鞋。修改比例时，mesh、rest bones 和 morph 坐标都会使用同一变换，不需要手动移动每个部件。

建模先在规范空间构造、融合和平滑部件，转移最多 4 个关节权重，再统一映射到掌心玩偶比例，最后生成形变。融合限定在同一模块内，保留发型、五官和服装的独立性。拓扑为实时渲染使用的混合三角形／多边形闭合表面，不是电影面部动画的全四边形拓扑。

## 保留的模块与骨架

默认部件：Body、Head、Eyes、Eyebrows、FaceDetails、Hair_Comma、Top_BlackTshirt、Bottom_WidePants、Socks、Shoes_Chunky。袜子在长裤和鞋之间，默认基本被遮挡。

17 根骨骼名称和层级保持不变：Root、Pelvis、Chest、Neck、Head，及左右 UpperArm、LowerArm、Hand、UpperLeg、LowerLeg、Foot。新比例需要新的静止骨骼位置，因此骨架契约标识升级为 **`squishy-humanoid-palm-v2`**。

**v1 与 v2 的绑定矩阵不同，不应直接混用部件。** 新版眼镜已重新适配。后续预制部件只要使用 v2 的 rest matrices、权重和形变场，即可在运行时替换，无需逐用户运行 Blender。

所有角色 mesh 保持 identity transforms、脚下统一 origin。Blender 使用 Z-up、正面 -Y，glTF 为 Y-up、正面 +Z。人物自身左侧为 +X。作者空间高度约 2.66 单位，若网页中需要实际高 16 cm，可将角色根节点统一缩放约 `0.16 / 2.66`，同时缩放 collider 与锚点。

多个材质可能被 Three.js 加载成一个父组下的多个 SkinnedMesh。按 `userData.slot` 识别部件并遍历后代。Three.js 可能清理骨骼名中的句点，例如 `UpperArm.L` 加载后为 `UpperArmL`；实际名称见验证报告。

加载可选部件后需要重新绑定到当前角色的同一套 skeleton，保持一致的 bind matrix，不能仅把已蒙皮部件挂在 Head 骨骼下。整个角色只需一套活动骨架。

## 8 个形变目标

`Squash`、`Stretch`、`Flatten`、`HeadSquash`、`FacePullLeft`、`FacePullRight`、`FaceStretch`、`FaceSquash`。

默认权重为 0，设计范围为 0–1。所有部件具有同名目标，位置与法线 morph 均进入 GLB。整体形变直接作用于新版比例；局部脸部形变通过可逆比例映射重新适配。控制时需同步所有活跃部件的同名目标，包括多材质子 mesh。

多个目标满权重叠加仍可能导致过度变形，建议交互初期限制到 0–0.7。整体压缩／拉伸改变顶点但不改变骨骼关节；与 ragdoll 同时使用时需重新拟合碰撞体及锚点，或将整体形变与 ragdoll 作为不同交互状态。

没有 Blender baked physics、IK 依赖或 Rapier 实现。契约中的 capsule 和锚点只是初始拟合建议；运行时仍需根据最终尺寸与形变设置质量、限制角度和相邻碰撞过滤。Blender bone-local 锚点不能直接当作 Rapier rigid-body-local 锚点。

## 材质限制

皮肤保留 roughness 0.60、IOR 1.42 和轻微 Blender subsurface。标准 glTF PBR 不会完整保留 Principled 的皮下散射；GLB 保留颜色、粗糙度及散射参数 extras，直接加载为半哑光。若网页要还原 Cycles 的细微透光感，需要后续材质扩展，本次未实现。

## 验证

```sh
node assets/squishy-base/validate_asset.mjs
blender --background --python assets/squishy-base/inspect_squishy.py
```

Three.js 检查涵盖实际加载、17 骨骼、归一化权重、绑定矩阵、各骨骼顶点影响、全部 morph 位置／法线以及可选眼镜的骨架一致性。Blender 检查非流形边、零面积面和可逆比例映射，并渲染姿态及形变对照。

详细面数、文件体积和绘制单元数以 `validation_report.json` 为准。未执行浏览器帧率或 Rapier 仿真测试。
