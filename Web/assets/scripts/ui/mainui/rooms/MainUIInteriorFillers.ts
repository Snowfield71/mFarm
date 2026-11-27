/** Extracted from MainUILand.ts; preserves the original gameplay behavior. */
import {
  Button,
  Color,
  Graphics,
  Label,
  LabelOutline,
  Mask,
  Node,
  ScrollView,
  Tween,
  UIOpacity,
  UITransform,
  Vec2,
  Vec3,
  tween,
  view,
} from "cc";
import { Design, GameValues } from "../../../config/GameConfig";
import { GameManager } from "../../../core/GameManager";
import { InventorySystem } from "../../../systems/InventorySystem";
import { LandBlock, LandSystem } from "../../../systems/LandSystem";
import {
  getItem,
  getPlantableCrops,
  ITEM_DB,
  ItemCategory,
  ItemDef,
} from "../../../config/ItemConfig";
import { fillRect, fillRoundRect, strokeRoundRect } from "../../utils/UIDraw";
import {
  ENFORCE_FARM_SEASON_RESTRICTION,
  getSeasonInfo,
  isSeasonAllowed,
} from "../../../config/SeasonConfig";
import { animateItemToInventory } from "../shared/MainUIRewardAnimation";
import { renderLivestockDialogContent } from "./MainUILivestockRooms";
import { renderProductionSceneContent } from "./MainUIProductionRooms";
import { FARM_BUILDING_CONTENT_HEIGHT, FARM_BUILDING_CONTENT_WIDTH, FARM_BUILDING_CONTENT_Y, FARM_BUILDING_DIALOG_BOTTOM_PANEL_CENTER_Y, InteriorFillerScene } from "../farm/MainUILandShared";



export const INTERIOR_ACTION_FILLERS: Partial<
  Record<InteriorFillerScene, Array<{ icon: string; label: string }>>
> = {
  chickenCoop: [
    { icon: "sceneChickenEggs", label: "\u6536\u53d6\u9e21\u86cb" },
    { icon: "sceneChickenChick", label: "\u5b75\u5316\u5c0f\u9e21" },
    { icon: "sceneChickenExpand", label: "\u6269\u5efa\u680f\u4f4d" },
    { icon: "sceneChickenFeed", label: "\u50a8\u5907\u9972\u6599" },
  ],
  barn: [
    { icon: "sceneBarnMilk", label: "\u6324\u5976\u6536\u83b7" },
    { icon: "sceneBarnHay", label: "\u9972\u6599\u5b58\u50a8" },
    { icon: "sceneBarnWheat", label: "\u6574\u7406\u5c0f\u9ea6" },
    { icon: "sceneBarnCowStatus", label: "\u725b\u53ea\u72b6\u6001" },
  ],
  beehive: [
    { icon: "sceneBeehiveHoney", label: "\u6536\u53d6\u8702\u871c" },
    { icon: "sceneBeehiveComb", label: "\u8702\u8721\u52a0\u5de5" },
    { icon: "sceneBeehiveBeeStatus", label: "\u8702\u7fa4\u72b6\u6001" },
    { icon: "sceneBeehiveFlowers", label: "\u82b1\u6e90\u7ba1\u7406" },
  ],
};


export function addInteriorFillerIcon(
  ui: any,
  parent: Node,
  name: string,
  icon: string,
  x: number,
  y: number,
  width: number,
  height = width,
  rotation = 0,
): Node {
  const node = new Node(name);
  node.addComponent(UITransform).setContentSize(width, height);
  node.setPosition(x, y);
  node.setRotationFromEuler(0, 0, rotation);
  ui.applyUiIcon(icon, node);
  parent.addChild(node);
  return node;
}


export function renderInteriorActionFillers(
  ui: any,
  layer: Node,
  scene: "chickenCoop" | "barn" | "beehive",
  buildingSlotId: number,
) {
  const actions = INTERIOR_ACTION_FILLERS[scene] || [];
  // Measured from the common lower-panel inner bounds in the 752 x 1359
  // rasters: x=58..694, y=1000..1235. Four 66 px cards with 4 px gaps map
  // to these dialog-space centres without touching the ornamental border.
  const centers = [-105, -35, 35, 105];
  actions.forEach((action, index) => {
    const card = new Node(`InteriorAction_${scene}_${index}`);
    card.addComponent(UITransform).setContentSize(68, 94);
    card.setPosition(centers[index], FARM_BUILDING_DIALOG_BOTTOM_PANEL_CENTER_Y);
    fillRoundRect(card, 66, 92, 8, new Color(255, 238, 196, 238));
    strokeRoundRect(card, 66, 92, 8, new Color(211, 126, 38, 255), 1.8);
    layer.addChild(card);

    addInteriorFillerIcon(
      ui,
      card,
      `InteriorActionIcon_${index}`,
      action.icon,
      0,
      12,
      52,
      52,
    );
    const label = ui.makeLabel(
      action.label,
      12,
      new Color(94, 48, 24, 255),
      true,
      0,
      -31,
      64,
      20,
    );
    label.getComponent(Label)!.lineHeight = 16;
    card.addChild(label);
    // The image-led scene remains uncluttered until the player deliberately
    // chooses an operation. Reuse the existing production panels instead of
    // duplicating business logic inside the decorative scene layer.
    card.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
      event?.stopPropagation?.();
      const dialog = layer.parent;
      if (!dialog?.isValid || buildingSlotId < 0) return;
      const contentName = scene === "beehive"
        ? "ProductionSceneContent"
        : "LivestockDialogContent";
      dialog.getChildByName(contentName)?.destroy();
      layer.active = false;
      const content = new Node(contentName);
      content.addComponent(UITransform).setContentSize(FARM_BUILDING_CONTENT_WIDTH, FARM_BUILDING_CONTENT_HEIGHT);
      content.setPosition(0, FARM_BUILDING_CONTENT_Y);
      dialog.addChild(content);
      if (scene === "beehive") {
        renderProductionSceneContent(ui, content, buildingSlotId);
      } else {
        renderLivestockDialogContent(ui, content);
      }
      dialog.getChildByName("ProductionSceneTitle")?.setSiblingIndex(dialog.children.length - 1);
      dialog.getChildByName("ProductionSceneClose")?.setSiblingIndex(dialog.children.length - 1);
      dialog.getChildByName("LivestockTitle")?.setSiblingIndex(dialog.children.length - 1);
      dialog.getChildByName("LivestockClose")?.setSiblingIndex(dialog.children.length - 1);
    });
  });
}
