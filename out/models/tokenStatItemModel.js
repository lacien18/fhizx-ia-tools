"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenStatItem = void 0;
const vscode = require("vscode");
class TokenStatItem extends vscode.TreeItem {
    label;
    statDescription;
    constructor(label, statDescription, iconName) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.label = label;
        this.statDescription = statDescription;
        this.description = statDescription;
        this.contextValue = "tokenStat";
        if (iconName)
            this.iconPath = new vscode.ThemeIcon(iconName);
    }
}
exports.TokenStatItem = TokenStatItem;
//# sourceMappingURL=tokenStatItemModel.js.map