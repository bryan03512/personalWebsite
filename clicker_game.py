import tkinter as tk

class ClickerGame:
    def __init__(self, root):
        self.root = root
        self.root.title("Clicker Game")
        self.root.geometry("400x500")
        self.root.resizable(False, False)

        self.score = 0
        self.click_power = 1
        self.auto_power = 0

        self.click_upgrade_cost = 10
        self.auto_upgrade_cost = 25

        self.score_label = tk.Label(root, text="Score: 0", font=("Arial", 24))
        self.score_label.pack(pady=20)

        self.click_button = tk.Button(
            root, text="CLICK ME", font=("Arial", 20),
            width=15, height=4, bg="#4CAF50", fg="white",
            command=self.on_click
        )
        self.click_button.pack(pady=20)

        self.click_upgrade_button = tk.Button(
            root, text=self.click_upgrade_text(), font=("Arial", 12),
            command=self.buy_click_upgrade
        )
        self.click_upgrade_button.pack(pady=10)

        self.auto_upgrade_button = tk.Button(
            root, text=self.auto_upgrade_text(), font=("Arial", 12),
            command=self.buy_auto_upgrade
        )
        self.auto_upgrade_button.pack(pady=10)

        self.stats_label = tk.Label(root, text=self.stats_text(), font=("Arial", 12))
        self.stats_label.pack(pady=20)

        self.tick()

    def click_upgrade_text(self):
        return f"Upgrade Click Power ({self.click_upgrade_cost} pts)"

    def auto_upgrade_text(self):
        return f"Buy Auto-Clicker ({self.auto_upgrade_cost} pts)"

    def stats_text(self):
        return f"Click Power: {self.click_power}  |  Auto/sec: {self.auto_power}"

    def on_click(self):
        self.score += self.click_power
        self.update_labels()

    def buy_click_upgrade(self):
        if self.score >= self.click_upgrade_cost:
            self.score -= self.click_upgrade_cost
            self.click_power += 1
            self.click_upgrade_cost = int(self.click_upgrade_cost * 1.5)
            self.update_labels()

    def buy_auto_upgrade(self):
        if self.score >= self.auto_upgrade_cost:
            self.score -= self.auto_upgrade_cost
            self.auto_power += 1
            self.auto_upgrade_cost = int(self.auto_upgrade_cost * 1.6)
            self.update_labels()

    def update_labels(self):
        self.score_label.config(text=f"Score: {self.score}")
        self.click_upgrade_button.config(text=self.click_upgrade_text())
        self.auto_upgrade_button.config(text=self.auto_upgrade_text())
        self.stats_label.config(text=self.stats_text())

    def tick(self):
        if self.auto_power > 0:
            self.score += self.auto_power
            self.update_labels()
        self.root.after(1000, self.tick)


if __name__ == "__main__":
    root = tk.Tk()
    game = ClickerGame(root)
    root.mainloop()
