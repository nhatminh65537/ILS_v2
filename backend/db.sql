#course

CREATE TYPE content_status AS ENUM ('draft', 'published', 'archived');

CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    category_id UUID, -- Liên kết tới bảng categories (nếu có)
    tags TEXT[], -- Sử dụng Array type của Postgres để lọc nhanh
    learning_points INT DEFAULT 0,
    estimated_duration INT, -- Tính bằng phút
    status content_status DEFAULT 'draft',
    max_depth INT DEFAULT 5, -- Cấu hình độ sâu tối đa cho cây bài học
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID -- FK tới User (Admin/Editor)
);

#node
CREATE TABLE nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    
    -- Materialized Path: Lưu chuỗi ID dạng "root_id/node1_id/node2_id"
    -- Giúp truy vấn toàn bộ nhánh con cực nhanh
    path TEXT NOT NULL, 
    
    title VARCHAR(255) NOT NULL,
    order_index INT DEFAULT 0, -- Sắp xếp thứ tự các mục cùng cấp
    
    is_lesson BOOLEAN DEFAULT FALSE,
    -- Polymorphic-like: Nếu là lesson thì link tới bảng lessons, nếu không thì là Folder
    content_id UUID, 
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_order_per_parent UNIQUE (parent_id, order_index)
);

CREATE INDEX idx_nodes_path ON nodes USING btree (path);


#lesson 
CREATE TYPE lesson_type AS ENUM ('markdown', 'video', 'external_outline');

CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    type lesson_type DEFAULT 'markdown',
    content TEXT, -- Chứa Markdown content hoặc URL video/outline
    outline_id VARCHAR(255), -- ID bài viết trên hệ thống Outline (nếu có)
    is_preview BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

#quizz
CREATE TABLE quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    quiz_points INT DEFAULT 0,
    time_limit INT, -- Tổng thời gian làm bài (giây)
    is_shuffle BOOLEAN DEFAULT TRUE, -- Tráo câu hỏi
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);