import {
  Color,
  Graphics,
  Node,
  UIOpacity,
  UITransform,
  Vec3,
  Tween,
  tween,
  view,
} from "cc";

export type RewardFlightData = {
  icon: string;
  iconType?: "ui" | "item";
  count: number;
};

type RewardDestination = "inventory" | "gold" | "diamond";

function getRewardDestination(reward: RewardFlightData): RewardDestination {
  const icon = reward.icon.toLowerCase();
  if (icon === "gold" || icon === "rewardgold") return "gold";
  if (icon === "diamond" || icon === "rewarddiamond") return "diamond";
  return "inventory";
}

function getRewardTarget(ui: any, destination: RewardDestination): Node | null {
  if (destination === "inventory") {
    return (
      ui.node
        .getChildByName("BottomNav")
        ?.getChildByName("Nav_inventory")
        ?.getChildByName("Icon") || null
    );
  }
  const currencyArea = ui.topBar?.getChildByName("CurrencyArea");
  const pillName = destination === "gold" ? "goldPill" : "diamondPill";
  return currencyArea?.getChildByName(pillName) || null;
}

function playDestinationSquash(icon: Node) {
  if (!icon.isValid) return;
  const restingScale = icon.scale.clone();
  Tween.stopAllByTarget(icon);
  icon.setScale(restingScale);
  tween(icon)
    .to(0.07, {
      scale: new Vec3(restingScale.x * 1.16, restingScale.y * 0.78, restingScale.z),
    }, { easing: "quadOut" })
    .to(0.1, {
      scale: new Vec3(restingScale.x * 0.92, restingScale.y * 1.12, restingScale.z),
    }, { easing: "quadOut" })
    .to(0.16, { scale: restingScale }, { easing: "backOut" })
    .start();
}

export function animateRewardsToInventory(
  ui: any,
  rewards: RewardFlightData[],
  startWorld: Vec3,
): boolean {
  const root: Node | undefined = ui.bubbleRoot;
  if (!root || !root.isValid || rewards.length === 0) return false;

  const visibleRewards = rewards
    .slice(0, 12)
    .map((reward) => ({
      reward,
      target: getRewardTarget(ui, getRewardDestination(reward)),
    }))
    .filter((entry): entry is { reward: RewardFlightData; target: Node } =>
      Boolean(entry.target?.isValid),
    );
  if (visibleRewards.length === 0) return false;

  // A visible flight already communicates what was received. Suppress the
  // generic top toast emitted by the same successful action.
  ui.__rewardAnimationToastSuppressUntil = Date.now() + 600;

  root.active = true;
  root.setSiblingIndex(ui.node.children.length - 1);
  const rootTransform =
    root.getComponent(UITransform) || root.addComponent(UITransform);
  const visible = view.getVisibleSize();
  rootTransform.setContentSize(visible.width, visible.height);

  const start = rootTransform.convertToNodeSpaceAR(startWorld);
  const lastFlightForTarget = new Map<Node, number>();
  visibleRewards.forEach((entry, index) =>
    lastFlightForTarget.set(entry.target, index),
  );

  visibleRewards.forEach(({ reward, target: targetNode }, index) => {
    const target = rootTransform.convertToNodeSpaceAR(targetNode.worldPosition);
    const bubble = new Node(`RewardFlight_${index}`);
    bubble.addComponent(UITransform).setContentSize(48, 48);
    const col = index % 4;
    const row = Math.floor(index / 4);
    const spreadX =
      (col - (Math.min(4, visibleRewards.length) - 1) / 2) * 42;
    const spreadY = row * 44;
    const origin = new Vec3(start.x + spreadX, start.y + 30 + spreadY, 0);
    bubble.setPosition(origin);
    bubble.setScale(new Vec3(0.15, 0.15, 1));
    const bubbleGraphics = bubble.addComponent(Graphics);
    bubbleGraphics.fillColor = new Color(255, 240, 191, 250);
    bubbleGraphics.circle(0, 0, 22);
    bubbleGraphics.fill();
    bubbleGraphics.strokeColor = new Color(181, 119, 58, 235);
    bubbleGraphics.lineWidth = 2;
    bubbleGraphics.circle(0, 0, 22);
    bubbleGraphics.stroke();

    const icon =
      reward.iconType === "item"
        ? ui.createItemIcon(reward.icon, 31, true)
        : new Node("RewardFlightIcon");
    if (reward.iconType !== "item") {
      icon.addComponent(UITransform).setContentSize(31, 31);
      ui.applyUiIcon(reward.icon, icon);
    }
    icon.setPosition(0, 4);
    bubble.addChild(icon);
    bubble.addChild(
      ui.makeLabel(
        `x${reward.count}`,
        10,
        new Color(72, 39, 20),
        true,
        9,
        -13,
        28,
        14,
      ),
    );
    const opacity = bubble.addComponent(UIOpacity);
    root.addChild(bubble);

    tween(bubble)
      .to(0.2, { scale: new Vec3(1, 1, 1) }, { easing: "backOut" })
      .start();

    const state = { t: 0 };
    const control = new Vec3(
      origin.x + (target.x - origin.x) * 0.32 - 42 - index * 2,
      Math.max(origin.y, target.y) + 82 + row * 12,
      0,
    );
    tween(state)
      .delay(1 + index * 0.035)
      .to(
        0.78,
        { t: 1 },
        {
          easing: "quadIn",
          onUpdate: () => {
            if (!bubble.isValid) return;
            const t = state.t;
            const oneMinusT = 1 - t;
            bubble.setPosition(
              oneMinusT * oneMinusT * origin.x +
                2 * oneMinusT * t * control.x +
                t * t * target.x,
              oneMinusT * oneMinusT * origin.y +
                2 * oneMinusT * t * control.y +
                t * t * target.y,
            );
            const scale = Math.max(0.28, 1 - t * 0.72);
            bubble.setScale(new Vec3(scale, scale, 1));
            opacity.opacity = Math.round(255 * Math.min(1, (1 - t) * 1.8));
          },
        },
      )
      .call(() => {
        if (bubble.isValid) bubble.destroy();
        if (lastFlightForTarget.get(targetNode) === index) {
          playDestinationSquash(targetNode);
        }
      })
      .start();
  });
  return true;
}

export function animateItemToInventory(
  ui: any,
  itemId: string,
  count: number,
  startWorld: Vec3,
): boolean {
  return animateRewardsToInventory(
    ui,
    [{ icon: itemId, iconType: "item", count }],
    startWorld,
  );
}
