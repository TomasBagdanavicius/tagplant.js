"use strict";

import { createSimpleButton, removeClasses } from "../../../core/functions/node.js";
import { objectFilterByKeys } from "../../../core/functions/object.js";
import { arrayElementRemove } from "../../../core/functions/array.js";
import { Menu } from "../../menu.js";
import { userPaths } from "../../../../var/paths.js";

export const ListingWithSelectableItems = ({ parentConstructor } = {}) => {
    const Mixin = class extends parentConstructor {
        static #defaultOptions = {
            selectItems: false,
            onRemoveMany: undefined
        }
        #options;
        #selectedItems = [];
        constructor(title, options) {
            super(title, options);
            this.#options = objectFilterByKeys(options, Mixin.#defaultOptions);
            if (this.#options.selectItems) {
                const selectedCount = this.#selectedItems.length;
                const [, details] = this.meta.appendPair("Selected Count", selectedCount);
                this.addEventListener("selectedcountchange", e => {
                    const { newSelectedCount } = e.detail;
                    details.textContent = newSelectedCount;
                });
                this.onItemBind(({ item, key, controls, isItemBindings }) => {
                    this.group.onMemberRemove(key, () => {
                        this.#removeFromSelected(key);
                    });
                    if (isItemBindings) {
                        const selectControlOptions = {};
                        if (userPaths?.stylesheets?.checkboxClassic) {
                            selectControlOptions.stylesheet = userPaths?.stylesheets?.checkboxClassic;
                        }
                        const selectControl = this.checkboxConstructor.createElement("select", selectControlOptions);
                        selectControl.addEventListener("change", e => {
                            const { newState } = e.detail;
                            if (newState) {
                                this.#addToSelected(key);
                                item.classList.add("selected");
                            } else {
                                this.#removeFromSelected(key);
                                removeClasses(item, ["selected"]);
                            }
                        });
                        controls.select = selectControl;
                    }
                });
            }
        }
        static get collectiveOptions() {
            return { ...parentConstructor.collectiveOptions, ...this.#defaultOptions };
        }
        get selectedItems() {
            return this.#selectedItems;
        }
        get selectedItemsCount() {
            return this.#selectedItems.length;
        }
        get isAllItemsSelected() {
            const itemCount = this.itemCount;
            return itemCount !== 0 && this.selectedItemsCount === itemCount;
        }
        get isNoAvailableItemsSelected() {
            return this.itemCount !== 0 && this.selectedItemsCount === 0;
        }
        #dispatchSelectedCountChange(newSelectedCount, oldSelectedCount, isAll) {
            this.dispatchEvent(new CustomEvent("selectedcountchange", {
                detail: { newSelectedCount, oldSelectedCount, isAll }
            }));
        }
        #addToSelected(key) {
            const oldSelectedCount = this.#selectedItems.length;
            this.#selectedItems.push(key);
            const newSelectedCount = oldSelectedCount + 1;
            const isAll = newSelectedCount === this.itemCount;
            this.#dispatchSelectedCountChange(newSelectedCount, oldSelectedCount, isAll);
        }
        #removeFromSelected(key) {
            if (this.#selectedItems.indexOf(key) !== -1) {
                const oldSelectedCount = this.#selectedItems.length;
                arrayElementRemove(this.#selectedItems, key);
                const newSelectedCount = oldSelectedCount - 1;
                this.#dispatchSelectedCountChange(newSelectedCount, oldSelectedCount, false);
                return true;
            } else {
                return false;
            }
        }
        #changeSelectedState(state, keys) {
            for (const key of keys) {
                if (this.group.hasKey(key)) {
                    const { controls: { select } } = this.getItemData(key);
                    select.checked = state;
                }
            }
        }
        #changeSelectedStateAll(state) {
            for (const { controls: { select } } of this.items()) {
                select.checked = state;
            }
        }
        selectItems(keys) {
            this.#changeSelectedState(true, keys);
        }
        selectAllItems() {
            this.#changeSelectedStateAll(true);
        }
        deselectItems(keys) {
            this.#changeSelectedState(false, keys);
        }
        deselectAllItems() {
            this.#changeSelectedStateAll(false);
        }
        releaseSelectAllItemsControl() {
            const button = createSimpleButton("Select All", ["select-all-items-button"]);
            button.addEventListener("click", () => {
                this.selectAllItems();
            });
            this.#buttonTiedToSelected(button);
            return button;
        }
        #buttonTiedToSelected(button) {
            if (this.isAllItemsSelected || !this.#options.selectItems || this.itemCount === 0) {
                button.disabled = true;
            }
            this.addEventListener("selectedcountchange", e => {
                const { isAll, newSelectedCount } = e.detail;
                if ((isAll || (newSelectedCount === 0 && this.itemCount === 0)) && !button.disabled) {
                    button.disabled = true;
                } else if (!isAll && button.disabled) {
                    button.disabled = false;
                }
            });
            this.group.addEventListener("countchange", e => {
                if (this.#options.selectItems) {
                    const { newCount } = e.detail;
                    if ((this.isAllItemsSelected || newCount === 0) && !button.disabled) {
                        button.disabled = true;
                    } else if (!this.isAllItemsSelected && button.disabled) {
                        button.disabled = false;
                    }
                }
            });
        }
        #buttonTiedToDeselected(button) {
            if (!this.#options.selectItems || this.itemCount === 0 || this.selectedItemsCount === 0) {
                button.disabled = true;
            }
            this.addEventListener("selectedcountchange", e => {
                const { newSelectedCount } = e.detail;
                if (!newSelectedCount && !button.disabled) {
                    button.disabled = true;
                } else if (newSelectedCount && button.disabled) {
                    button.disabled = false;
                }
            });
            this.group.addEventListener("countchange", e => {
                const { newCount } = e.detail;
                if (this.#options.selectItems) {
                    if ((newCount === 0 || this.selectedItemsCount === 0) && !button.disabled) {
                        button.disabled = true;
                    } else if (this.selectedItemsCount !== 0 && button.disabled) {
                        button.disabled = false;
                    }
                }
            });
        }
        releaseDeselectAllItemsControl() {
            const button = createSimpleButton("Deselect All", ["deselect-all-items-button"]);
            if (this.isNoAvailableItemsSelected || !this.#options.selectItems) {
                button.disabled = true;
            }
            button.addEventListener("click", () => {
                this.deselectAllItems();
            });
            this.#buttonTiedToDeselected(button);
            return button;
        }
        releaseDeleteSelectedItemsControl() {
            const button = createSimpleButton("Delete Selected", ["delete-selected-entries-button"]);
            button.addEventListener("click", () => {
                this.deleteEntries([...this.#selectedItems]);
            });
            this.#buttonTiedToDeselected(button);
            return button;
        }
        releaseControlsMenu({ headingText = "Select Items", includeDeleteSelected = false } = {}) {
            const menu = new Menu({ headingText });
            menu.append(this.releaseSelectAllItemsControl(), "select-all");
            menu.append(this.releaseDeselectAllItemsControl(), "deselect-all");
            if (includeDeleteSelected) {
                menu.append(this.releaseDeleteSelectedItemsControl(), "delete-selected");
            }
            return menu;
        }
    }
    return Mixin;
}