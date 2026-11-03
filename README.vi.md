# pi-superspec

[English](README.md) | Tiếng Việt

## Giới thiệu

pi-superspec là một pi package đưa workflow Superspec vào pi: các change theo hướng spec-driven do OpenSpec quản lý, còn các skill của Superpowers đảm nhận brainstorming, lập kế hoạch, triển khai và review. Package đi kèm schema `superspec` của OpenSpec, các lệnh `/opsx-*` và các skill phía sau chúng.

Trong một repository mới chỉ có `/opsx-init`. Khi project đã được khởi tạo, các lệnh còn lại sẽ tự xuất hiện.

## Yêu cầu

Bạn tự cài các dependency; package không cài chúng.

- [OpenSpec](https://github.com/Fission-AI/OpenSpec) 1.4 trở lên.
- [Superpowers](https://github.com/obra/superpowers) cho pi.
- Chạy `/opsx-init` không cần Git (ngoài git repository nó chỉ cảnh báo), nhưng workflow phía sau có dùng git: `/opsx-apply` tạo worktree và branch, còn finalize đóng branch lại.
- Finalize dùng GitHub CLI (`gh`) để phát hiện, tạo và comment trên PR. Nó là tùy chọn: nếu thiếu, finalize coi branch như chưa có PR và ghi reviewer comment là skipped hoặc failed; merge và push không bị rollback.
- Trước `/opsx-apply`, hãy ở trên một feature branch không phải integration branch của bạn (`main` hoặc `master`). Trên integration branch, `/opsx-apply` vẫn chạy nhưng kèm cảnh báo, và phần closeout phía git của finalize không tạo ra PR dùng được, nên bạn phải dùng cách thủ công `finishing-a-development-branch` (escape hatch).
- Finalize push feature branch bằng `git push origin`, nên repository cần có remote `origin` mà bạn push được.

## Cài đặt

Cài theo đúng thứ tự này. Đừng bỏ qua hai bước đầu.

```sh
brew install openspec
pi install git:github.com/obra/superpowers
```

Các pi package tùy chọn, kèm phương án thay thế khi chúng không có:

| Package | Bổ sung | Phương án thay thế khi không có |
|---|---|---|
| `pi-subagents` | tool `subagent`, giúp `/opsx-apply` chạy các task bằng subagent-driven development | Superpowers `executing-plans` trong session hiện tại |
| `rpiv-ask-user-question` | tool `ask_user_question` để chọn giữa các lựa chọn | một câu hỏi thường với các lựa chọn đánh số |
| `rpiv-todo` | tool `todo` để theo dõi tiến độ | một checklist được nêu trong câu trả lời của agent |

Cài chúng bằng `pi install` theo hướng dẫn riêng của từng package. Sau đó cài package này:

```sh
pi install https://github.com/ttdua/pi-superspec
```

## Bắt đầu nhanh

Chạy lần lượt các bước sau trong repository của bạn. Các lệnh của change sẽ dừng lại để bạn review trước bước kế tiếp.

1. `/opsx-init`: cài schema đi kèm vào `openspec/schemas/superspec/`, đặt `schema: superspec` trong `openspec/config.yaml`, validate và tự reload pi. Nó chạy `openspec init --tools none` nếu `openspec/` chưa tồn tại. Cần OpenSpec 1.4 trở lên, và chỉ cảnh báo nếu thư mục không phải git repository hoặc thiếu Superpowers.
2. `/opsx-new <name>`: tạo change và hiển thị hướng dẫn của artifact đầu tiên. Nó không tạo artifact nào.
3. `/opsx-continue`: tạo artifact kế tiếp, mỗi lần chạy một artifact, rồi dừng để review. Lặp lại cho đến khi có đủ các artifact tới plan; khi apply là artifact sẵn sàng kế tiếp, nó dừng và chỉ bạn sang `/opsx-apply`. (`/opsx-ff` tạo tất cả trong một lần; bước brainstorm vẫn hỏi bạn duyệt.)
4. Tạo và chuyển sang một feature branch (ví dụ `feat/<name>`) nếu bạn chưa ở trên branch nào như vậy. Hãy commit output của `/opsx-init` (`openspec/config.yaml` và `openspec/schemas/superspec/`) lên branch đó, vì `/opsx-apply` chỉ commit thư mục của change và worktree được tạo từ feature branch. Sau đó chạy `/opsx-apply`. Nó tạo một worktree trên branch đặt theo tên change, triển khai các task và ghi `apply.md`.
5. `/opsx-verify`: chạy với worktree làm thư mục làm việc. Nó ghi `verify.md` với `PASS`, `PASS_WITH_WARNINGS` hoặc `FAIL`. Nếu `FAIL`, chạy lại `/opsx-apply` cho một vòng sửa lỗi.
6. Finalize: không phải một lệnh. Sau khi verify đạt, chạy `/opsx-continue` với worktree làm thư mục làm việc để tạo artifact `finalize`. Phần closeout phía git merge branch của worktree trở lại feature branch, xóa worktree và push feature branch.
7. `/opsx-archive`: chạy trong main checkout (không phải worktree), sau finalize và trước khi PR được merge. Thư mục của change nằm trên feature branch sau finalize; xem guide để biết trình tự chính xác.

Hướng dẫn đầy đủ nằm trong [docs/usage-guide.md](docs/usage-guide.md) (chỉ có tiếng Anh).

## Các lệnh

| Command | Chức năng |
|---|---|
| `/opsx-init` | Thiết lập repository cho workflow Superspec. Luôn khả dụng. |
| `/opsx-explore` | Khám phá ý tưởng và làm rõ yêu cầu trước hoặc trong một change. Không viết application code. |
| `/opsx-new` | Bắt đầu một change và hiển thị hướng dẫn của artifact đầu tiên. |
| `/opsx-continue` | Tạo artifact kế tiếp, rồi dừng để review. |
| `/opsx-ff` | Brainstorm tương tác, rồi tạo mọi artifact cần để triển khai. Dừng trước apply. |
| `/opsx-apply` | Triển khai change trong một worktree và ghi `apply.md`. |
| `/opsx-verify` | Verify change đã apply và ghi `verify.md`. |
| `/opsx-sync` | Merge delta spec vào `openspec/specs/` mà không archive. |
| `/opsx-archive` | Sync nếu cần, rồi archive một change đã hoàn thành. |

Mọi lệnh trừ `/opsx-init` chỉ tồn tại trong một project đã khởi tạo. Các lệnh `opsx-propose` và `opsx-bulk-archive` không được đi kèm.

Nếu `openspec/schemas/superspec/` đã tồn tại và khác với schema đi kèm, `/opsx-init` cảnh báo và không ghi gì vào đó. Công cụ nâng cấp chưa được đi kèm.

## Gỡ cài đặt

Gỡ package sẽ gỡ mọi command và skill, bao gồm `/opsx-init`. Thư mục `openspec/` của bạn vẫn là một project OpenSpec hợp lệ, với các change, archive và spec. Những file sau vẫn còn lại, và bạn có thể xóa chúng:

- `openspec/schemas/superspec/` (schema đã được copy) và lock file của nó `openspec/schemas/superspec/.pi-superspec.json`.
- dòng `schema: superspec` trong `openspec/config.yaml`.

Package không ghi gì dưới `.pi/`. Cài lại package sẽ kích hoạt lại project, vì schema marker vẫn còn.

## Ghi công và giấy phép

- [Superspec](https://github.com/danielhanold/superspec) của Daniel Hanold, mà package này điều chỉnh cho pi.
- JiangWay `sdd-plus-superpowers`, nguồn gốc của Superspec.
- [OpenSpec](https://github.com/Fission-AI/OpenSpec) của Fission AI.

Giấy phép MIT. Xem [LICENSE](LICENSE).
