# pi-superspec

[English](README.md) | Tiếng Việt

## Giới thiệu

pi-superspec là một pi package đưa workflow Superspec vào pi: các change theo hướng spec-driven do OpenSpec quản lý, còn các skill của Superpowers đảm nhận brainstorming, lập kế hoạch, triển khai và review. Package đi kèm schema `superspec` của OpenSpec, các lệnh `/opsx-*` và các skill phía sau chúng.

Trong một repository mới chỉ có `/opsx-init`. Khi project đã được khởi tạo, các lệnh còn lại sẽ tự xuất hiện.

## Yêu cầu

Bạn tự cài các dependency; package không cài chúng.

- [OpenSpec](https://github.com/Fission-AI/OpenSpec) 1.16 trở lên.
- [Superpowers](https://github.com/obra/superpowers) cho pi.
- pi, coding agent mà package này mở rộng.
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
| `pi-subagents` | tool `subagent`, giúp `/opsx-apply` chạy các task bằng subagent-driven development và các stage dùng được agent `superspec.*` đi kèm (xem [Tích hợp subagent tùy chọn](#tích-hợp-subagent-tùy-chọn)) | Superpowers `executing-plans` trong session hiện tại |
| `rpiv-ask-user-question` | tool `ask_user_question` để chọn giữa các lựa chọn | một câu hỏi thường với các lựa chọn đánh số |
| `rpiv-todo` | tool `todo` để theo dõi tiến độ | một checklist được nêu trong câu trả lời của agent |
| Plannotator (tool Inbox `plannotator_inbox`, tool `plannotator` hoặc CLI) | review gate và câu hỏi qua Plannotator Inbox hoặc giao diện review; extension chọn kênh khả dụng đầu tiên (xem [hướng dẫn sử dụng](docs/usage-guide.md)) | `ask_user_question`, rồi văn bản thường với các lựa chọn đánh số |

Cài chúng bằng `pi install` theo hướng dẫn riêng của từng package. Sau đó cài package này:

```sh
pi install https://github.com/ttdua/pi-superspec
```

## Tích hợp subagent tùy chọn

Package đi kèm sáu agent definition trong `agents/`, được khai báo cho `pi-subagents` qua khóa manifest `pi-subagents.agents`. Tích hợp này là tùy chọn và chỉ dành cho bản tương thích: không có `pi-subagents`, mọi workflow vẫn giữ đường chạy inline.

Sáu role chuẩn: `superspec.scout`, `superspec.spec-reviewer`, `superspec.plan-reviewer`, `superspec.implementer`, `superspec.task-reviewer` và `superspec.verifier`. Chúng cùng tồn tại với các agent generic và không phải bản sao của chúng.

- **Hiển thị so với routing.** Khi package đã cài, sáu role hiển thị trên toàn package với `pi-subagents`. Workflow chỉ route tới chúng khi một stage Superspec đang hoạt động (ví dụ `/opsx-apply`, `/opsx-verify`, `/opsx-generate-specs`); chỉ hiển thị thì không ủy quyền gì.
- **Quyền sở hữu cấu hình.** Bạn sở hữu các override của agent (file agent ở user hoặc project) và model mà chúng dùng, lấy từ settings của pi và pi-subagents. Package không đặt model theo từng lần gọi, không ghi settings và không tạo bản sao agent.
- **Sau khi cập nhật package.** Reload hoặc restart pi để definition mới được phát hiện. Không cần cài lại schema: agent không thuộc schema đã copy, và không chạy lại `/opsx-init`.
- **Vắng mặt so với không tương thích.** Nếu cả tool `subagent` lẫn helper kích hoạt của nó đều không có, stage thông báo phương án inline một lần rồi chạy tiếp inline. Nếu tích hợp có mặt nhưng không tương thích, hoặc một role bị vô hiệu hóa, thiếu hay chạy lỗi, stage báo lại và dừng. Nó không bao giờ lặng lẽ chuyển sang agent generic, CLI hay làm inline.
- **Gỡ bỏ.** Gỡ package sẽ gỡ sáu role khỏi việc phát hiện. Không có bản sao nào trong thư mục user hay project của bạn cần dọn.
- **Bản đã kiểm thử.** Tích hợp được xem xét (inspect) trên `pi-subagents` 0.84.0 tại commit `d9f8f8c9a709a23adf5f323bb046f3fa91517d4c`. Inspect không phải smoke test, và đây không phải phiên bản tối thiểu đã được kiểm thử. Quy trình smoke runtime nằm trong [docs/e2e-checklist.md](docs/e2e-checklist.md) (chỉ có tiếng Anh); kết quả chạy không được ghi ở đây.
- **Shell allowlist.** Khi một role giới hạn lệnh shell bằng allowlist, đó là rào chắn về những gì agent được chỉ dẫn và cho phép chạy, không phải sandbox. Đừng dựa vào nó để cô lập code không tin cậy.

## Bắt đầu nhanh

Chạy lần lượt các bước sau trong repository của bạn. Các lệnh của change sẽ dừng lại để bạn review trước bước kế tiếp.

1. `/opsx-init`: cài schema đi kèm vào `openspec/schemas/superspec/`, đặt `schema: superspec` trong `openspec/config.yaml`, validate và tự reload pi. Nó chạy `openspec init --tools none` nếu `openspec/` chưa tồn tại. Cần OpenSpec 1.16 trở lên, và chỉ cảnh báo nếu thư mục không phải git repository hoặc thiếu Superpowers.
2. `/opsx-new <name>`: tạo change và hiển thị hướng dẫn của artifact đầu tiên. Nó không tạo artifact nào.
3. `/opsx-continue`: tạo artifact kế tiếp, mỗi lần chạy một artifact, chạy một review gate cho artifact đó và, khi gate được approve, tiếp tục sang artifact kế tiếp trong cùng lần chạy. Nó dừng trước `apply` và chỉ bạn sang `/opsx-apply`; gate không được approve thì dừng. (`/opsx-ff` tạo tất cả trong một lần; nó chạy review gate cho `brainstorm.md`, tạo phần còn lại không dừng, rồi chạy một review gate cuối.)
4. Tạo và chuyển sang một feature branch (ví dụ `feat/<name>`) nếu bạn chưa ở trên branch nào như vậy. Hãy commit output của `/opsx-init` (`openspec/config.yaml` và `openspec/schemas/superspec/`) lên branch đó, vì `/opsx-apply` chỉ commit thư mục của change và worktree được tạo từ feature branch. Hãy push branch một lần bằng `git push -u origin feat/<name>`, vì finalize chạy `git pull` thường trên branch đó và lệnh này lỗi nếu branch chưa có upstream. Sau đó chạy `/opsx-apply`. Nó tạo một worktree trên branch đặt theo tên change, triển khai các task và ghi `apply.md`.
5. `/opsx-verify`: tự tìm worktree (`git worktree list`), nên chạy từ checkout nào cũng được; đường dẫn do `/opsx-apply` in ra và được ghi trong `apply.md`. Nó ghi `verify.md` với `PASS`, `PASS_WITH_WARNINGS` hoặc `FAIL`. Nếu `FAIL`, chạy lại `/opsx-apply` cho một vòng sửa lỗi.
6. Finalize: không phải một lệnh. Sau khi verify đạt, khởi động (hoặc khởi động lại) pi với đường dẫn worktree làm thư mục làm việc, rồi chạy `/opsx-continue` để tạo artifact `finalize`. `/opsx-continue` không tự tìm worktree: chạy từ main checkout, nó đọc bản của change trong main checkout (không có `apply.md`) nên sẽ chỉ bạn quay lại `/opsx-apply`. Phần closeout phía git merge branch của worktree trở lại feature branch, xóa worktree (khi nó nằm dưới `.worktrees/`, `worktrees/` hoặc `~/.config/superpowers/worktrees/`) và push feature branch.
7. `/opsx-archive`: mở lại pi trong main checkout (không phải worktree, vì finalize có thể đã xóa nó), sau finalize và trước khi PR (nếu có) được merge. Thư mục của change nằm trên feature branch sau finalize; xem guide để biết trình tự chính xác.

Hướng dẫn đầy đủ nằm trong [docs/usage-guide.md](docs/usage-guide.md) (chỉ có tiếng Anh).

## Các lệnh

| Command | Chức năng |
|---|---|
| `/opsx-init` | Thiết lập repository cho workflow Superspec. Luôn khả dụng. Tùy chọn `--lang <language>` đặt ngôn ngữ của các tài liệu OpenSpec. Tùy chọn `--generate` chỉ in gợi ý chạy `/opsx-generate-specs` tiếp theo, không làm việc nào của agent. |
| `/opsx-explore` | Khám phá ý tưởng và làm rõ yêu cầu trước hoặc trong một change. Không viết application code. |
| `/opsx-new` | Bắt đầu một change và hiển thị hướng dẫn của artifact đầu tiên. |
| `/opsx-continue` | Tạo artifact kế tiếp, chạy review gate cho nó và, khi được approve, tiếp tục sang artifact kế tiếp. Dừng trước apply. |
| `/opsx-ff` | Brainstorm tương tác và chạy review gate cho `brainstorm.md`, tạo mọi artifact cần để triển khai, rồi chạy một review gate cuối. Dừng trước apply. |
| `/opsx-apply` | Triển khai change trong một worktree và ghi `apply.md`. |
| `/opsx-verify` | Verify change đã apply và ghi `verify.md`. |
| `/opsx-sync` | Merge delta spec vào `openspec/specs/` mà không archive. |
| `/opsx-archive` | Sync nếu cần, rồi archive một change đã hoàn thành. |
| `/opsx-generate-specs` | Cho codebase có sẵn: map code thành các capability, hỏi bạn xác nhận một lần, rồi soạn delta spec cho từng capability trong change `bootstrap-specs`. Dừng trước `/opsx-ff bootstrap-specs`. |

Mọi lệnh trừ `/opsx-init` chỉ tồn tại trong một project đã khởi tạo. Các lệnh `opsx-propose` và `opsx-bulk-archive` không được đi kèm.

Nếu `openspec/schemas/superspec/` đã tồn tại và khác với schema đi kèm, `/opsx-init` cảnh báo và không ghi gì vào đó. Công cụ nâng cấp chưa được đi kèm.

## Gỡ cài đặt

Gỡ package sẽ gỡ mọi command và skill, bao gồm `/opsx-init`. Thư mục `openspec/` của bạn vẫn là một project OpenSpec hợp lệ, với các change, archive và spec. Những file sau vẫn còn lại, và bạn có thể xóa chúng:

- `openspec/schemas/superspec/` (schema đã được copy) và lock file của nó `openspec/schemas/superspec/.pi-superspec.json`.
- dòng `schema: superspec` trong `openspec/config.yaml`.

Package không ghi gì dưới `.pi/`. Cài lại package sẽ kích hoạt lại project, vì schema marker vẫn còn.

## Ghi công và giấy phép

- [Superspec](https://github.com/danielhanold/superspec) của Daniel Hanold, mà package này điều chỉnh cho pi.
- [JiangWay `sdd-plus-superpowers`](https://github.com/JiangWay/OpenSpec/tree/main/schemas/sdd-plus-superpowers), nguồn gốc của Superspec.
- [OpenSpec](https://github.com/Fission-AI/OpenSpec) của Fission AI.

Giấy phép MIT. Xem [LICENSE](LICENSE).
