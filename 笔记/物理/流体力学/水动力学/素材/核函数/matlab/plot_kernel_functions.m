% 绘制 SPH 常用核函数的径向剖面与梯度对比。
% 运行后会把三张 PNG 输出到 ../图片/。

clear; close all; clc;

scriptDir = fileparts(mfilename('fullpath'));
outDir = fullfile(scriptDir, '..', '图片');
if ~exist(outDir, 'dir')
    mkdir(outDir);
end

set(groot, 'defaultAxesFontName', 'Microsoft YaHei');
set(groot, 'defaultTextFontName', 'Microsoft YaHei');

% 为了让不同核的形状可以直接比较，取 h = 1，并用 q = r / h。
h = 1;
q = linspace(0, 1, 500);

% ---------------- 1. 核函数值：按各自中心值归一化 ----------------
W_gaussian = (1 / (pi * h^2))^(3/2) * exp(-(q * h).^2 / h^2);
W_poly6 = 315 / (64 * pi * h^9) .* (h^2 - (q * h).^2).^3;
W_spiky = 15 / (pi * h^6) .* (h - q * h).^3;

W_gaussian_n = W_gaussian / W_gaussian(1);
W_poly6_n = W_poly6 / W_poly6(1);
W_spiky_n = W_spiky / W_spiky(1);

fig1 = figure('Color', 'w', 'Position', [100 100 900 560]);
plot(q, W_gaussian_n, 'LineWidth', 2.4); hold on;
plot(q, W_poly6_n, 'LineWidth', 2.4);
plot(q, W_spiky_n, 'LineWidth', 2.4);
grid on; box off;
xlim([0 1]); ylim([0 1.05]);
xlabel('r / h');
ylabel('W(r,h) / W(0,h)');
title('常用 SPH 核函数的归一化径向剖面');
legend('Gaussian', 'Poly6', 'Spiky', 'Location', 'northeast');
exportgraphics(fig1, fullfile(outDir, '核函数径向对比.png'), 'Resolution', 300);

% ---------------- 2. 梯度幅值：按各自最大值归一化 ----------------
% Gaussian: dW/dr = -2r/h^2 * W
grad_gaussian = 2 * q .* exp(-q.^2);

% Poly6: |dW/dr| = 945/(32*pi*h^9) * r * (h^2-r^2)^2
grad_poly6 = q .* (1 - q.^2).^2;

% Spiky: |dW/dr| = 45/(pi*h^6) * (h-r)^2
grad_spiky = (1 - q).^2;

grad_gaussian = grad_gaussian / max(grad_gaussian);
grad_poly6 = grad_poly6 / max(grad_poly6);
grad_spiky = grad_spiky / max(grad_spiky);

fig2 = figure('Color', 'w', 'Position', [100 100 900 560]);
plot(q, grad_gaussian, 'LineWidth', 2.4); hold on;
plot(q, grad_poly6, 'LineWidth', 2.4);
plot(q, grad_spiky, 'LineWidth', 2.4);
grid on; box off;
xlim([0 1]); ylim([0 1.05]);
xlabel('r / h');
ylabel('|d W / d r| / max');
title('核函数梯度幅值对比');
legend('Gaussian', 'Poly6', 'Spiky', 'Location', 'northeast');
exportgraphics(fig2, fullfile(outDir, '核函数梯度对比.png'), 'Resolution', 300);

% ---------------- 3. 粘度核与拉普拉斯 ----------------
% 粘度核在 r=0 处含有 1/r 项，绘图时从 0.02h 开始。
qv = linspace(0.02, 1, 500);
W_viscosity_shape = -0.5 * qv.^3 + qv.^2 + 0.5 ./ qv - 1;
laplacian_viscosity_shape = 1 - qv;

fig3 = figure('Color', 'w', 'Position', [100 100 1100 500]);
tiledlayout(1, 2, 'Padding', 'compact', 'TileSpacing', 'compact');

nexttile;
plot(qv, W_viscosity_shape, 'LineWidth', 2.5);
grid on; box off;
xlim([0 1]); ylim([0 10]);
xlabel('r / h');
ylabel('归一化核形状');
title('粘度核');

nexttile;
plot(qv, laplacian_viscosity_shape, 'LineWidth', 2.5);
grid on; box off;
xlim([0 1]); ylim([0 1.05]);
xlabel('r / h');
ylabel('归一化 Laplacian');
title('粘度核拉普拉斯');

exportgraphics(fig3, fullfile(outDir, '粘度核与拉普拉斯.png'), 'Resolution', 300);

fprintf('核函数示意图已输出到：%s\n', outDir);
