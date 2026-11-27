import {
  BlockInputEvents,
  Button,
  Color,
  Graphics,
  Label,
  LabelOutline,
  Node,
  UITransform,
  Vec3,
  tween,
  view,
} from "cc";
import { Design, GameValues } from "../../../config/GameConfig";
import { GameManager } from "../../../core/GameManager";
import { InventorySystem } from "../../../systems/InventorySystem";
import {
  bindTaskStylePressFeedback,
  drawCatalogStyleProgress,
  fillRect,
  fillRoundRect,
  strokeRoundRect,
} from "../../utils/UIDraw";

const CROP_SPEED_TICKET_ID = "cropSpeedTicket";

type CropMaturityDialogOptions = {
  title: string;
  progress: () => number;
  complete: () => boolean;
  refresh: () => void;
  successText: string;
  preserveExisting?: boolean;
};

type MaturityPayment = "diamond" | "ticket";

function formatResourceCount(value: number): string {
  if (value < 10_000) return `${value}`;
  const valueInTenThousands = Math.floor(value / 1_000) / 10;
  return `${valueInTenThousands.toFixed(1).replace(/\.0$/, "")}万`;
}

function addOutlinedLabel(
  ui: any,
  parent: Node,
  text: string,
  size: number,
  color: Color,
  x: number,
  y: number,
  width: number,
  height: number,
  outlineColor = new Color(255, 249, 229, 255),
  outlineWidth = 2,
) {
  const node = ui.makeLabel(text, size, color, true, x, y, width, height);
  const outline = node.addComponent(LabelOutline);
  outline.color = outlineColor;
  outline.width = outlineWidth;
  parent.addChild(node);
  return node;
}

/** Shared two-resource maturity chooser for farm, greenhouse and flower house. */
export function showCropMaturityDialog(
  ui: any,
  options: CropMaturityDialogOptions,
) {
  const preserveExisting = options.preserveExisting ?? false;
  const diamondCost = GameValues.SPEEDUP_DIAMOND;
  if (!preserveExisting) ui.dialogRoot.removeAllChildren();
  ui.dialogRoot.active = true;

  const vs = view.getVisibleSize();
  const blocker = new Node("CropMaturityMask");
  blocker.addComponent(UITransform).setContentSize(Design.WIDTH, vs.height);
  fillRect(blocker, Design.WIDTH, vs.height, new Color(26, 20, 14, 138));
  ui.dialogRoot.addChild(blocker);

  const panel = new Node("CropMaturityDialog");
  panel.addComponent(UITransform).setContentSize(318, 252);
  panel.addComponent(BlockInputEvents);
  ui.dialogRoot.addChild(panel);

  const shadow = new Node("PanelShadow");
  shadow.addComponent(UITransform).setContentSize(318, 252);
  shadow.setPosition(0, -5);
  fillRoundRect(shadow, 318, 252, 25, new Color(67, 38, 21, 110));
  panel.addChild(shadow);

  const frame = new Node("PanelFrame");
  frame.addComponent(UITransform).setContentSize(318, 252);
  fillRoundRect(frame, 318, 252, 25, new Color(159, 88, 39, 255));
  strokeRoundRect(
    frame,
    318,
    252,
    25,
    new Color(91, 47, 25, 255),
    2,
  );
  panel.addChild(frame);

  const surface = new Node("PanelSurface");
  surface.addComponent(UITransform).setContentSize(308, 242);
  fillRoundRect(surface, 308, 242, 21, new Color(255, 247, 220, 255));
  strokeRoundRect(
    surface,
    308,
    242,
    21,
    new Color(255, 215, 139, 255),
    2,
  );
  panel.addChild(surface);

  const header = new Node("HeaderBand");
  header.addComponent(UITransform).setContentSize(260, 43);
  header.setPosition(-6, 92);
  fillRoundRect(header, 260, 43, 15, new Color(255, 226, 158, 255));
  strokeRoundRect(
    header,
    260,
    43,
    15,
    new Color(229, 166, 73, 255),
    1.5,
  );
  panel.addChild(header);

  addOutlinedLabel(
    ui,
    panel,
    options.title,
    20,
    new Color(110, 56, 28, 255),
    -6,
    92,
    204,
    30,
  );

  const progressLabel = ui.makeLabel(
    "生长进度 0%",
    14,
    new Color(101, 83, 53, 255),
    true,
    0,
    54,
    250,
    25,
  );
  panel.addChild(progressLabel);

  const progressTrack = new Node("ProgressTrack");
  progressTrack.addComponent(UITransform).setContentSize(252, 13);
  progressTrack.setPosition(0, 35);
  drawCatalogStyleProgress(
    progressTrack,
    252,
    0,
    new Color(220, 190, 153, 245),
    new Color(148, 210, 112, 235),
    "CropMaturityProgressFill",
    "CropMaturityProgressKnob",
    false,
  );
  panel.addChild(progressTrack);

  const prompt = ui.makeLabel(
    "选择钻石或加速券，立即完成本次生长",
    13,
    new Color(126, 96, 60, 255),
    false,
    0,
    12,
    270,
    24,
  );
  panel.addChild(prompt);

  const createOptionCard = (
    name: string,
    x: number,
    iconKey: string,
    title: string,
    costText: string,
    payment: MaturityPayment,
  ) => {
    const card = new Node(name);
    card.addComponent(UITransform).setContentSize(134, 84);
    card.setPosition(x, -54);
    panel.addChild(card);

    const icon =
      payment === "ticket"
        ? ui.createItemIcon(CROP_SPEED_TICKET_ID, 34, true)
        : new Node(`${name}Icon`);
    if (payment !== "ticket") {
      icon.addComponent(UITransform).setContentSize(34, 34);
      ui.applyUiIcon(iconKey, icon);
    }
    icon.name = `${name}Icon`;
    icon.setPosition(-43, 10);
    card.addChild(icon);

    const titleNode = addOutlinedLabel(
      ui,
      card,
      title,
      14,
      new Color(82, 62, 42, 255),
      18,
      21,
      88,
      24,
      new Color(255, 255, 244, 255),
      1,
    );
    const costNode = ui.makeLabel(
      costText,
      12,
      new Color(91, 75, 54, 255),
      true,
      18,
      -2,
      88,
      22,
    );
    card.addChild(costNode);
    const statusNode = ui.makeLabel(
      "",
      11,
      new Color(92, 126, 79, 255),
      false,
      0,
      -28,
      118,
      20,
    );
    card.addChild(statusNode);

    card.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
      event?.stopPropagation?.();
      tween(card)
        .to(0.07, { scale: new Vec3(0.94, 0.94, 1) }, { easing: "quadOut" })
        .to(0.1, { scale: Vec3.ONE }, { easing: "backOut" })
        .call(() => {
          dismiss();
          finish(payment);
        })
        .start();
    });
    return { card, titleNode, statusNode };
  };

  const diamondCard = createOptionCard(
    "DiamondMaturityCard",
    -71,
    "diamond",
    "钻石催熟",
    `消耗 ${diamondCost} 钻石`,
    "diamond",
  );
  const ticketCard = createOptionCard(
    "TicketMaturityCard",
    71,
    CROP_SPEED_TICKET_ID,
    "加速券催熟",
    "消耗 1 张",
    "ticket",
  );

  const close = new Node("CloseButton");
  close.addComponent(UITransform).setContentSize(44, 44);
  close.setPosition(136, 101);
  const closeGraphics = close.addComponent(Graphics);
  closeGraphics.strokeColor = new Color(132, 72, 32, 255);
  closeGraphics.lineWidth = 4;
  closeGraphics.moveTo(-7.5, 7.5);
  closeGraphics.lineTo(7.5, -7.5);
  closeGraphics.moveTo(7.5, 7.5);
  closeGraphics.lineTo(-7.5, -7.5);
  closeGraphics.stroke();
  bindTaskStylePressFeedback(close);
  close.addComponent(Button).node.on(Node.EventType.TOUCH_END, (event: any) => {
    event?.stopPropagation?.();
    dismiss();
  });
  panel.addChild(close);

  function dismiss() {
    ui.unschedule(refreshStatus);
    if (panel.isValid) panel.destroy();
    if (blocker.isValid) blocker.destroy();
    if (!preserveExisting) ui.dialogRoot.active = false;
  }

  function finish(payment: MaturityPayment) {
    const inventory = InventorySystem.getInstance();
    const game = GameManager.getInstance();
    if (payment === "diamond" && game.diamond < diamondCost) {
      ui.toast("钻石不足，还不能使用钻石催熟");
      return;
    }
    if (
      payment === "ticket" &&
      !inventory.hasItems(CROP_SPEED_TICKET_ID, 1)
    ) {
      ui.toast("加速券不足，请先获取农作物加速券");
      return;
    }
    if (!options.complete()) {
      ui.toast("该植物已经结束生长，无需再次加速");
      return;
    }
    if (payment === "diamond") {
      game.spendDiamond(diamondCost);
      ui.refreshTopBar();
    } else {
      inventory.removeItem(CROP_SPEED_TICKET_ID, 1);
    }
    options.refresh();
    ui.toast(options.successText);
  }

  function refreshCard(
    card: ReturnType<typeof createOptionCard>,
    available: boolean,
    status: string,
    fill: Color,
    stroke: Color,
  ) {
    const graphics = card.card.getComponent(Graphics) || card.card.addComponent(Graphics);
    graphics.clear();
    fillRoundRect(
      card.card,
      134,
      84,
      15,
      available ? fill : new Color(231, 225, 207, 255),
    );
    strokeRoundRect(
      card.card,
      134,
      84,
      15,
      available ? stroke : new Color(167, 151, 124, 255),
      1.5,
    );
    card.statusNode.getComponent(Label)!.string = status;
    card.statusNode.getComponent(Label)!.color = available
      ? new Color(84, 119, 72, 255)
      : new Color(185, 86, 60, 255);
    card.titleNode.getComponent(Label)!.color = available
      ? new Color(82, 62, 42, 255)
      : new Color(127, 116, 98, 255);
  }

  function refreshStatus() {
    if (!panel.isValid) {
      ui.unschedule(refreshStatus);
      return;
    }
    const inventory = InventorySystem.getInstance();
    const game = GameManager.getInstance();
    const progress = Math.max(0, Math.min(100, options.progress()));
    progressLabel.getComponent(Label)!.string = `生长进度 ${Math.floor(progress)}%`;

    drawCatalogStyleProgress(
      progressTrack,
      252,
      progress / 100,
      new Color(220, 190, 153, 245),
      new Color(148, 210, 112, 235),
      "CropMaturityProgressFill",
      "CropMaturityProgressKnob",
      false,
    );

    const ticketCount = inventory.getItemCount(CROP_SPEED_TICKET_ID);
    refreshCard(
      diamondCard,
      game.diamond >= diamondCost,
      game.diamond >= diamondCost
        ? `持有 ${formatResourceCount(game.diamond)} 钻石`
        : "钻石不足",
      new Color(226, 247, 255, 255),
      new Color(80, 163, 194, 255),
    );
    refreshCard(
      ticketCard,
      ticketCount >= 1,
      ticketCount >= 1
        ? `持有 ${formatResourceCount(ticketCount)} 张`
        : "当前没有加速券",
      new Color(232, 250, 220, 255),
      new Color(103, 171, 79, 255),
    );
  }

  blocker.addComponent(Button).node.on(Node.EventType.TOUCH_END, dismiss);
  refreshStatus();
  ui.schedule(refreshStatus, 0.16);
  panel.setScale(0.88, 0.88, 1);
  tween(panel)
    .to(0.18, { scale: Vec3.ONE }, { easing: "backOut" })
    .start();
}
